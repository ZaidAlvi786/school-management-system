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
import { Loader2, Camera, CheckCircle2, RotateCcw, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { registerFace } from "@/lib/fastapi-client";

interface FaceRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userType?: "student" | "teacher";
}

export default function FaceRegistrationDialog({
  open,
  onOpenChange,
  onSuccess,
  userType = "student",
}: FaceRegistrationDialogProps) {
  const { data: session } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceDetectorRef = useRef<any | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDetectionsRef = useRef<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const { toast } = useToast();

  // Load MediaPipe from CDN using script tag
  const loadMediaPipe = useCallback(async (): Promise<boolean> => {
    try {
      // Check if already loaded
      if ((window as any).mediapipeFaceDetector) {
        faceDetectorRef.current = (window as any).mediapipeFaceDetector;
        return true;
      }

      setIsLoading(true);
      setStatusMessage("Loading face detection model...");

      // Load MediaPipe via script tag (more reliable than dynamic import)
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
                  modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
                  delegate: 'GPU',
                },
                runningMode: 'VIDEO',
                minDetectionConfidence: 0.5,
              });
              
              window.mediapipeFaceDetector = faceDetector;
              window.mediapipeLoaded = true;
              
              // Dispatch event when loaded
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
            setIsLoading(false);
            setStatusMessage("Face detector ready");
            resolve(true);
          } else {
            // Fallback to canvas detection
            setIsLoading(false);
            setStatusMessage("Using fallback detection");
            faceDetectorRef.current = { useFallback: true };
            resolve(true);
          }
          window.removeEventListener("mediapipeLoaded", onLoaded);
        };
        
        window.addEventListener("mediapipeLoaded", onLoaded);
        document.head.appendChild(script);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (!(window as any).mediapipeFaceDetector) {
            setIsLoading(false);
            setStatusMessage("Using fallback detection");
            faceDetectorRef.current = { useFallback: true };
            window.removeEventListener("mediapipeLoaded", onLoaded);
            resolve(true);
          }
        }, 10000);
      });
    } catch (err: any) {
      console.error("Failed to load MediaPipe, using fallback:", err);
      setIsLoading(false);
      setStatusMessage("Using fallback detection");
      faceDetectorRef.current = { useFallback: true };
      return true;
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadMediaPipe().then(() => {
        startCamera();
      });
    } else {
      stopCamera();
      setCapturedImage(null);
      setError(null);
      setFaceDetected(false);
      setCountdown(null);
      setDetectionConfidence(0);
    }
    return () => {
      stopCamera();
    };
  }, [open, loadMediaPipe]);

  const startCamera = async () => {
    try {
      setError(null);
      setStatusMessage("Starting camera...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
        setStatusMessage("Position your face in the center of the frame");

        // Start face detection
        startFaceDetection();
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      let errorMsg = "Failed to access camera.";
      if (err.name === "NotAllowedError") {
        errorMsg = "Camera permission denied. Please allow camera access.";
      } else if (err.name === "NotFoundError") {
        errorMsg = "No camera found on your device.";
      }
      setError(errorMsg);
      setStatusMessage("Camera error");
      toast({
        title: "Camera Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const detectFaceMediaPipe = async (video: HTMLVideoElement): Promise<{ detected: boolean; confidence: number }> => {
    if (!faceDetectorRef.current || faceDetectorRef.current.useFallback) {
      return detectFaceFallback(video);
    }

    try {
      const startTimeMs = performance.now();
      const detections = faceDetectorRef.current.detectForVideo(video, startTimeMs);

      if (detections.detections && detections.detections.length > 0) {
        const bestDetection = detections.detections.reduce(
          (best: any, current: any) =>
            (current.score || 0) > (best.score || 0) ? current : best
        );

        const confidence = bestDetection.score || 0;

        // Check for exactly one face with high confidence
        if (detections.detections.length === 1 && confidence > 0.7) {
          return { detected: true, confidence };
        }
      }

      return { detected: false, confidence: 0 };
    } catch (err) {
      console.error("MediaPipe detection error:", err);
      return detectFaceFallback(video);
    }
  };

  const detectFaceFallback = (video: HTMLVideoElement): { detected: boolean; confidence: number } => {
    if (!canvasRef.current) {
      return { detected: false, confidence: 0 };
    }

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return { detected: false, confidence: 0 };

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      let skinTonePixels = 0;
      let totalBrightness = 0;
      let contrastSum = 0;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;

        // Skin tone detection
        if (
          r > 95 &&
          g > 40 &&
          b > 20 &&
          Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
          Math.abs(r - g) > 15 &&
          r > g &&
          r > b
        ) {
          skinTonePixels++;
        }

        // Calculate contrast
        if (i > 0) {
          const prevBrightness = (pixels[i - 4] + pixels[i - 3] + pixels[i - 2]) / 3;
          contrastSum += Math.abs(brightness - prevBrightness);
        }
      }

      const avgBrightness = totalBrightness / (pixels.length / 4);
      const skinToneRatio = skinTonePixels / (pixels.length / 4);
      const avgContrast = contrastSum / pixels.length;

      // Heuristic: good lighting, skin tones present, reasonable contrast
      const detected =
        avgBrightness > 50 &&
        avgBrightness < 230 &&
        skinToneRatio > 0.1 &&
        avgContrast > 5;
      const confidence = detected ? Math.min(0.9, 0.6 + skinToneRatio * 0.3) : 0;

      return { detected, confidence };
    } catch (err) {
      return { detected: false, confidence: 0 };
    }
  };

  const startFaceDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || capturedImage || isProcessing) return;

      const detection = await detectFaceMediaPipe(videoRef.current);
      const confidence = detection.confidence;

      setDetectionConfidence(confidence);
      setFaceDetected(detection.detected);

      // Track last 5 detection results for stability
      lastDetectionsRef.current.push(confidence);
      if (lastDetectionsRef.current.length > 5) {
        lastDetectionsRef.current.shift();
      }

      // Check if face is stable (last 3-5 detections all above threshold)
      const avgConfidence =
        lastDetectionsRef.current.reduce((a, b) => a + b, 0) / lastDetectionsRef.current.length;
      const isStable =
        lastDetectionsRef.current.length >= 3 &&
        lastDetectionsRef.current.every((c) => c > 0.7) &&
        avgConfidence > 0.8;

      if (isStable && !countdown) {
        // Start countdown before auto-capture
        let counter = 3;
        setCountdown(counter);
        setStatusMessage(`Face detected! Capturing in ${counter} seconds...`);

        const countdownInterval = setInterval(() => {
          counter--;
          if (counter > 0) {
            setCountdown(counter);
            setStatusMessage(`Face detected! Capturing in ${counter} seconds...`);
          } else {
            clearInterval(countdownInterval);
            setCountdown(null);
            autoCapturePhoto();
          }
        }, 1000);
      } else if (!detection.detected) {
        setStatusMessage("Position your face in the center of the frame");
        setCountdown(null);
      } else if (!isStable) {
        setStatusMessage("Hold still for a moment...");
      }
    }, 150); // Check every 150ms
  }, [capturedImage, isProcessing, countdown]);

  const autoCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL("image/jpeg", 0.95);
      setCapturedImage(imageData);
      setFaceDetected(false);
      setCountdown(null);

      // Stop detection
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }

      toast({
        title: "Photo Captured",
        description: "Registering your face automatically...",
      });

      // Auto-register after capture
      setTimeout(() => {
        handleRegisterFace(imageData);
      }, 500);
    } catch (err: any) {
      console.error("Capture error:", err);
      toast({
        title: "Capture Failed",
        description: "Failed to capture photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const manualCapturePhoto = () => {
    autoCapturePhoto();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setFaceDetected(false);
    setCountdown(null);
    setDetectionConfidence(0);
    lastDetectionsRef.current = [];

    if (videoRef.current && faceDetectorRef.current) {
      startFaceDetection();
    }

    toast({
      title: "Retake Photo",
      description: "Position your face again",
    });
  };

  const handleRegisterFace = async (imageData?: string) => {
    const imgData = imageData || capturedImage;
    if (!imgData || isProcessing || !session?.user) return;

    try {
      setIsProcessing(true);
      setError(null);
      setStatusMessage("Registering your face...");

      if (!session.user.id) {
        throw new Error("User ID not found. Please log in again.");
      }

      // Send base64 image(s) to FastAPI backend
      // Convert single image to array for API compatibility (backward compatibility)
      const result = await registerFace(session.user.id, userType, [imgData], false, undefined);

      toast({
        title: "Success!",
        description: result.message || "Your face has been registered successfully!",
        className: "bg-green-500 text-white",
      });

      stopCamera();
      setStatusMessage("Registration complete!");

      // Wait before closing
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      console.error("Registration error:", err);
      const errorMsg = err.message || "Failed to register face. Please try again.";
      setError(errorMsg);
      setStatusMessage("Registration failed");
      toast({
        title: "Registration Failed",
        description: errorMsg,
        variant: "destructive",
      });

      // Allow retry
      setCapturedImage(null);
      retakePhoto();
    } finally {
      setIsProcessing(false);
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
    faceDetectorRef.current = null;
    lastDetectionsRef.current = [];
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setError(null);
    setFaceDetected(false);
    setCountdown(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Register Your Face</DialogTitle>
          <DialogDescription>
            Position your face in the center. The system will automatically detect and register your face.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-center">
              <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin" />
              <p>Loading face detection model...</p>
            </div>
          )}

          {!capturedImage && !isLoading ? (
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
                  <div
                    className={`border-2 rounded-full w-64 h-64 flex items-center justify-center transition-all ${
                      faceDetected && detectionConfidence > 0.7
                        ? "border-green-500 bg-green-500/10"
                        : "border-white/50 bg-black/50"
                    }`}
                  >
                    {countdown ? (
                      <div className="text-green-500 text-4xl font-bold bg-black/50 px-4 py-2 rounded-full">
                        {countdown}
                      </div>
                    ) : faceDetected && detectionConfidence > 0.7 ? (
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

                {/* Confidence indicator */}
                {detectionConfidence > 0 && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    {Math.round(detectionConfidence * 100)}%
                  </div>
                )}
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">{statusMessage}</p>
              </div>

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
                  onClick={manualCapturePhoto}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capture Now
                </Button>
              </div>
            </>
          ) : (
            <>
              {capturedImage && (
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <img
                    src={capturedImage}
                    alt="Captured face"
                    className="w-full h-full object-cover"
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center text-white">
                        <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                        <p>Registering your face...</p>
                        <p className="text-sm mt-2">Saving to database...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isProcessing && (
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  className="w-full"
                  disabled={isProcessing}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
