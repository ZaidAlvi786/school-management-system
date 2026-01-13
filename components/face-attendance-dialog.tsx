"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { markAttendance } from "@/lib/fastapi-client";

interface FaceAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  classId?: string; // Required for students
}

// Face detection using MediaPipe or simple canvas-based detection
// For production, consider using a proper face detection library
function detectFaceInImage(imageData: string): Promise<{ detected: boolean; quality: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Simple heuristic: check if image has reasonable dimensions
      // In production, use proper face detection (MediaPipe, face-api.js, etc.)
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ detected: false, quality: 0 });
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Basic quality checks
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageDataObj.data;
      
      // Calculate average brightness
      let totalBrightness = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        totalBrightness += (r + g + b) / 3;
      }
      const avgBrightness = totalBrightness / (pixels.length / 4);

      // Assume face is detected if image is reasonable quality
      // Backend will do actual face detection
      const quality = avgBrightness > 50 && avgBrightness < 230 ? 80 : 40;
      resolve({ detected: true, quality });
    };
    img.onerror = () => resolve({ detected: false, quality: 0 });
    img.src = imageData;
  });
}

export default function FaceAttendanceDialog({
  open,
  onOpenChange,
  onSuccess,
  classId,
}: FaceAttendanceDialogProps) {
  const { data: session } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("Initializing camera...");
  const [faceDetected, setFaceDetected] = useState(false);
  const [imageQuality, setImageQuality] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    try {
      setError(null);
      setStatusMessage("Starting camera...");
      setFaceDetected(false);
      setImageQuality(0);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: "user",
          // Better quality constraints
          aspectRatio: { ideal: 16 / 9 }
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
        setStatusMessage("Position your face in the frame");
        
        // Start continuous face detection
        startFaceDetection();
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      let errorMsg = "Failed to access camera.";
      if (err.name === "NotAllowedError") {
        errorMsg = "Camera permission denied. Please allow camera access.";
      } else if (err.name === "NotFoundError") {
        errorMsg = "No camera found on your device.";
      } else if (err.name === "NotReadableError") {
        errorMsg = "Camera is being used by another application.";
      }
      setError(errorMsg);
      setStatusMessage("Camera error");
    }
  };

  const faceDetectorRef = useRef<any | null>(null);

  // Load MediaPipe Face Detector from CDN (to avoid build errors)
  const loadMediaPipe = useCallback(async (): Promise<boolean> => {
    try {
      // Check if already loaded
      if (faceDetectorRef.current) return true;
      if ((window as any).mediapipeFaceDetector) {
        faceDetectorRef.current = (window as any).mediapipeFaceDetector;
        return true;
      }

      // Load MediaPipe from CDN using dynamic script injection
      return new Promise((resolve) => {
        const script = document.createElement("script");
        script.type = "module";
        script.textContent = `
          import { FaceDetector, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
          
          (async function() {
            try {
              const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
              );
              
              const faceDetector = await FaceDetector.createFromOptions(vision, {
                baseOptions: {
                  modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/0.0.11/blaze_face_short_range.tflite',
                  delegate: 'GPU',
                },
                runningMode: 'VIDEO',
                minDetectionConfidence: 0.7,
              });
              
              window.mediapipeFaceDetector = faceDetector;
              window.mediapipeLoaded = true;
              window.dispatchEvent(new CustomEvent('mediapipeLoaded'));
            } catch (error) {
              console.error('MediaPipe load error:', error);
              window.mediapipeLoaded = false;
              window.dispatchEvent(new CustomEvent('mediapipeLoaded'));
            }
          })();
        `;
        
        const onLoaded = () => {
          if ((window as any).mediapipeFaceDetector) {
            faceDetectorRef.current = (window as any).mediapipeFaceDetector;
            resolve(true);
          } else {
            resolve(false);
          }
        };
        
        window.addEventListener('mediapipeLoaded', onLoaded, { once: true });
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error("Failed to load MediaPipe:", error);
      return false;
    }
  }, []);

  const startFaceDetection = useCallback(async () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    // Load MediaPipe first
    const loaded = await loadMediaPipe();
    if (!loaded) {
      setStatusMessage("Face detection unavailable. Using basic mode.");
      // Fallback to basic detection if MediaPipe fails
      detectionIntervalRef.current = setInterval(() => {
        if (!videoRef.current || isProcessing) return;
        setFaceDetected(false); // Don't show green until real face is detected
        setStatusMessage("Position your face in the center");
      }, 500);
      return;
    }

    detectionIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || isProcessing || !faceDetectorRef.current) return;

      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        
        ctx.drawImage(video, 0, 0);

        // Use MediaPipe for actual face detection
        const startTimeMs = performance.now();
        const detections = faceDetectorRef.current.detectForVideo(video, startTimeMs);

        if (detections.detections && detections.detections.length > 0) {
          // Get the best detection (highest confidence)
          const bestDetection = detections.detections.reduce(
            (best: any, current: any) =>
              (current.score || 0) > (best.score || 0) ? current : best
          );

          const confidence = bestDetection.score || 0;
          
          // Only consider it detected if confidence is high (>= 0.7) and exactly one face
          const detected = detections.detections.length === 1 && confidence >= 0.7;
          
          setFaceDetected(detected);
          setImageQuality(Math.round(confidence * 100));

          if (detected) {
            setStatusMessage("Face detected! Ready to capture.");
          } else if (detections.detections.length > 1) {
            setStatusMessage("Multiple faces detected. Please ensure only your face is visible.");
          } else if (confidence < 0.7) {
            setStatusMessage("Face confidence too low. Please move closer and improve lighting.");
          } else {
            setStatusMessage("Position your face in the center of the frame");
          }
        } else {
          // No face detected
          setFaceDetected(false);
          setImageQuality(0);
          setStatusMessage("No face detected. Please position your face in the camera.");
        }
      } catch (err) {
        console.error("Face detection error:", err);
        setFaceDetected(false);
        setImageQuality(0);
      }
    }, 200); // Check every 200ms for real-time feedback
  }, [isProcessing, loadMediaPipe]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    // SECURITY: Only allow capture if face is actually detected by MediaPipe
    if (!faceDetected) {
      toast({
        title: "Face Not Detected",
        description: "Please ensure your face is clearly visible in the frame before capturing.",
        variant: "destructive",
      });
      return;
    }

    try {
      const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0);
      
      // Verify face is still present using MediaPipe before capture
      if (faceDetectorRef.current) {
        try {
          const startTimeMs = performance.now();
          const detections = faceDetectorRef.current.detectForVideo(video, startTimeMs);
          
          if (!detections.detections || detections.detections.length === 0) {
            toast({
              title: "Face Not Detected",
              description: "Face not detected in frame. Please ensure your face is visible.",
              variant: "destructive",
            });
            return;
          }
          
          // Ensure exactly one face with high confidence
          const bestDetection = detections.detections.reduce(
            (best: any, current: any) =>
              (current.score || 0) > (best.score || 0) ? current : best
          );
          
          if (detections.detections.length > 1) {
            toast({
              title: "Multiple Faces Detected",
              description: "Please ensure only your face is visible in the frame.",
              variant: "destructive",
            });
            return;
          }
          
          if ((bestDetection.score || 0) < 0.7) {
            toast({
              title: "Low Face Confidence",
              description: "Face confidence too low. Please move closer and ensure good lighting.",
              variant: "destructive",
            });
            return;
          }
        } catch (err) {
          console.error("Face verification error:", err);
          // Continue with capture if MediaPipe fails (backend will verify)
        }
      }
      
      // Capture at high quality
      const imageData = canvas.toDataURL("image/jpeg", 0.95);
      
      setCapturedImage(imageData);
      setScanning(false);
      
      // Auto-submit after capture
      markAttendanceFromImage(imageData);
    } catch (err: any) {
      console.error("Capture error:", err);
      toast({
        title: "Capture Failed",
        description: "Failed to capture photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const markAttendanceFromImage = async (imageData?: string) => {
    const imgData = imageData || capturedImage;
    if (!imgData || isProcessing || !session?.user) return;

    try {
      setIsProcessing(true);
      setError(null);
      setStatusMessage("Verifying face...");

      // Mark attendance via FastAPI
      // Note: class_id is optional for students - backend will auto-fetch from student record
      // Liveness verification is optional but recommended for security
      const result = await markAttendance(
        imgData,
        session.user.role as "student" | "teacher",
        classId, // Optional - will be validated/fetched automatically by backend
        "web",
        false, // liveness_verified - set to true if liveness challenge completed
        undefined, // liveness_images - optional sequence of images for liveness
        undefined // challenge_type - optional: "blink", "head_left", "head_right", "combined"
      );

      if (result.already_marked) {
          const msg = "Attendance already marked for today.";
          setError(msg);
          toast({
            title: "Already Marked",
            description: msg,
            variant: "default",
          });
        setSuccess(true);
          setTimeout(() => {
            onSuccess();
            onOpenChange(false);
            setSuccess(false);
          }, 2000);
        return;
      }

      // Success
      setSuccess(true);
      setStatusMessage("Attendance Marked!");
      toast({
        title: "Success!",
        description: result.message + (result.confidence ? ` (Confidence: ${(result.confidence * 100).toFixed(1)}%)` : ""),
        className: "bg-green-500 text-white",
      });
      stopCamera();
      
      // Auto close after 2 seconds
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      console.error("Error marking attendance:", err);
      const msg = err.message || "Failed to mark attendance.";
      setError(msg);
       toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
      setIsProcessing(false);
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    // Note: Keep faceDetectorRef for reuse, but reset detection state
    setCapturedImage(null);
    setFaceDetected(false);
    setImageQuality(0);
  };

  const handleClose = () => {
    stopCamera();
    setError(null);
    setSuccess(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Mark Today&apos;s Attendance</DialogTitle>
          <DialogDescription>
            Position your face in the center. The system will automatically detect your face and mark attendance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
              <XCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <span>Attendance marked successfully for today!</span>
            </div>
          )}

          {!capturedImage && !success && (
            <>
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Face detection indicator */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`border-2 rounded-full w-64 h-64 flex items-center justify-center transition-all ${
                    faceDetected && imageQuality > 60 
                      ? "border-green-500 bg-green-500/10" 
                      : "border-white/50 bg-black/50"
                  }`}>
                    {faceDetected && imageQuality > 60 ? (
                      <div className="text-green-500 text-sm text-center bg-black/50 px-3 py-1 rounded-full">
                        ✓ Face Detected
                      </div>
                    ) : (
                      <div className="text-white text-sm text-center bg-black/50 px-3 py-1 rounded-full">
                        Position Face Here
                      </div>
                    )}
                  </div>
                </div>

                {/* Quality indicator */}
                {imageQuality > 0 && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    Quality: {imageQuality}%
                  </div>
                )}

                {/* Status overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-center text-white">
                      <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                      <p>Processing...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-gray-600">
                  {statusMessage}
                </span>
              </div>

              {/* Quality warnings */}
              {imageQuality > 0 && imageQuality < 60 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Improve image quality:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {imageQuality < 50 && <li>Ensure good lighting</li>}
                      {imageQuality < 55 && <li>Position face clearly in center</li>}
                      {imageQuality < 60 && <li>Avoid shadows and glare</li>}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={capturePhoto}
                  disabled={isProcessing || (!faceDetected && imageQuality < 60)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Capture & Mark Attendance
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {capturedImage && !success && (
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <img
                src={capturedImage}
                alt="Captured face"
                className="w-full h-full object-cover"
              />
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
