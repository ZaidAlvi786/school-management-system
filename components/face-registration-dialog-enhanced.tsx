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
import { Loader2, Camera, CheckCircle2, RotateCcw, AlertCircle, Eye, Move3D } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { registerFace } from "@/lib/fastapi-client";
import { Progress } from "@/components/ui/progress";

interface FaceRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userType?: "student" | "teacher";
}

type RegistrationStep = "capture" | "liveness" | "review" | "uploading";

export default function FaceRegistrationDialogEnhanced({
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
  const livenessFramesRef = useRef<string[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [step, setStep] = useState<RegistrationStep>("capture");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [livenessChallenge, setLivenessChallenge] = useState<"blink" | "head_left" | "head_right" | null>(null);
  const [livenessFrames, setLivenessFrames] = useState<string[]>([]);
  const [livenessVerified, setLivenessVerified] = useState(false);
  const { toast } = useToast();

  const TARGET_IMAGES = 8; // Capture 8 images for better accuracy
  const LIVENESS_FRAME_COUNT = 10; // Capture 10 frames for liveness detection

  // Load MediaPipe from CDN (dynamic import to avoid build errors)
  const loadMediaPipe = useCallback(async (): Promise<boolean> => {
    try {
      if (faceDetectorRef.current) return true;
      
      // Load MediaPipe from CDN using dynamic script injection
      return new Promise((resolve) => {
        if ((window as any).mediapipeFaceDetector) {
          faceDetectorRef.current = (window as any).mediapipeFaceDetector;
          resolve(true);
          return;
        }

        setIsLoading(true);
        setStatusMessage("Loading face detection model...");

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
            setIsLoading(false);
            setStatusMessage("Face detector ready");
            resolve(true);
          } else {
            setIsLoading(false);
            setStatusMessage("Failed to load face detector");
            resolve(false);
          }
        };
        
        window.addEventListener('mediapipeLoaded', onLoaded, { once: true });
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error("Failed to load MediaPipe:", error);
      setIsLoading(false);
      return false;
    }
  }, []);

  useEffect(() => {
    if (open) {
      setStep("capture");
      setCapturedImages([]);
      setCurrentImageIndex(0);
      setLivenessVerified(false);
      setLivenessFrames([]);
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
      
      const loaded = await loadMediaPipe();
      if (!loaded) {
        throw new Error("Failed to load face detection model");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: "user",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
        setStatusMessage(`Position your face in the center (Image 1/${TARGET_IMAGES})`);
        startFaceDetection();
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      let errorMsg = "Failed to access camera.";
      if (err.name === "NotAllowedError") {
        errorMsg = "Camera permission denied. Please allow camera access.";
      }
      setError(errorMsg);
      setStatusMessage("Camera error");
    }
  };

  const startFaceDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
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

        const startTimeMs = performance.now();
        const detections = faceDetectorRef.current.detectForVideo(video, startTimeMs);

        if (detections.detections && detections.detections.length > 0) {
          const bestDetection = detections.detections.reduce(
            (best: any, current: any) =>
              (current.score || 0) > (best.score || 0) ? current : best
          );

          const confidence = bestDetection.score || 0;
          const detected = detections.detections.length === 1 && confidence >= 0.7;
          
          setFaceDetected(detected);
          setDetectionConfidence(confidence);

          if (detected && step === "capture") {
            setStatusMessage(`Face detected! Ready to capture (${currentImageIndex + 1}/${TARGET_IMAGES})`);
          }
        } else {
          setFaceDetected(false);
          setDetectionConfidence(0);
        }
      } catch (err) {
        console.error("Face detection error:", err);
      }
    }, 200);
  }, [isProcessing, step, currentImageIndex]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;
    if (!faceDetected) {
      toast({
        title: "Face Not Detected",
        description: "Please ensure your face is clearly visible before capturing.",
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
      
      const imageData = canvas.toDataURL("image/jpeg", 0.95);
      
      // Verify face is still detected
      if (faceDetectorRef.current) {
        const startTimeMs = performance.now();
        const detections = faceDetectorRef.current.detectForVideo(video, startTimeMs);
        
        if (!detections.detections || detections.detections.length === 0) {
          toast({
            title: "Face Not Detected",
            description: "Face not detected in captured image. Please try again.",
            variant: "destructive",
          });
          return;
        }
        
        const bestDetection = detections.detections.reduce(
          (best: any, current: any) =>
            (current.score || 0) > (best.score || 0) ? current : best
        );
        
        if (detections.detections.length > 1 || (bestDetection.score || 0) < 0.7) {
          toast({
            title: "Invalid Face Detection",
            description: detections.detections.length > 1 
              ? "Multiple faces detected. Please ensure only your face is visible."
              : "Face confidence too low. Please move closer.",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Add to captured images
      const newImages = [...capturedImages, imageData];
      setCapturedImages(newImages);
      setCurrentImageIndex(newImages.length);
      
      // Continue capturing or move to liveness
      if (newImages.length < TARGET_IMAGES) {
        setStatusMessage(`Captured ${newImages.length}/${TARGET_IMAGES}. Position your face for the next image.`);
        // Auto-capture next image after 2 seconds
        setTimeout(() => {
          if (faceDetected && newImages.length < TARGET_IMAGES) {
            capturePhoto();
          }
        }, 2000);
      } else {
        // All images captured, move to liveness
        setStatusMessage("All images captured! Now verify liveness...");
        setTimeout(() => {
          setStep("liveness");
          startLivenessChallenge("blink");
        }, 1500);
      }
    } catch (err: any) {
      console.error("Capture error:", err);
      toast({
        title: "Capture Failed",
        description: "Failed to capture photo. Please try again.",
        variant: "destructive",
      });
    }
  }, [capturedImages, faceDetected, isProcessing, toast]);

  const startLivenessChallenge = (challengeType: "blink" | "head_left" | "head_right") => {
    setLivenessChallenge(challengeType);
    setLivenessFrames([]);
    livenessFramesRef.current = [];
    
    let frameCount = 0;
    const captureInterval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) {
        clearInterval(captureInterval);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        livenessFramesRef.current.push(imageData);
        frameCount++;
        
        if (frameCount >= LIVENESS_FRAME_COUNT) {
          clearInterval(captureInterval);
          const frames = [...livenessFramesRef.current];
          setLivenessFrames(frames);
          
          // Move to next challenge or complete
          if (challengeType === "blink") {
            setTimeout(() => startLivenessChallenge("head_left"), 1000);
          } else if (challengeType === "head_left") {
            setTimeout(() => startLivenessChallenge("head_right"), 1000);
          } else {
            // All challenges complete
            setLivenessVerified(true);
            setStatusMessage("Liveness verification complete! Reviewing images...");
            setTimeout(() => {
              setStep("review");
            }, 1000);
          }
        }
      }
    }, 200); // Capture frame every 200ms
  };

  const handleRegisterFace = async () => {
    if (capturedImages.length < 1 || isProcessing || !session?.user) return;

    try {
      setIsProcessing(true);
      setError(null);
      setStep("uploading");
      setStatusMessage("Registering your face...");

      if (!session.user.id) {
        throw new Error("User ID not found. Please log in again.");
      }

      // Combine all liveness frames
      const allLivenessFrames = livenessFrames;

      // Send all images to backend
      const result = await registerFace(
        session.user.id,
        userType,
        capturedImages, // Array of 8 images
        livenessVerified,
        allLivenessFrames.length > 0 ? "combined" : undefined
      );

      toast({
        title: "Success!",
        description: result.message || `Your face has been registered successfully with ${capturedImages.length} images!`,
        className: "bg-green-500 text-white",
      });

      stopCamera();
      setStatusMessage("Registration complete!");

      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      console.error("Registration error:", err);
      const errorMsg = err.message || "Failed to register face. Please try again.";
      setError(errorMsg);
      setStatusMessage("Registration failed");
      setStep("review");
      toast({
        title: "Registration Failed",
        description: errorMsg,
        variant: "destructive",
      });
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
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImages([]);
    setCurrentImageIndex(0);
    setError(null);
    setFaceDetected(false);
    setStep("capture");
    setLivenessVerified(false);
    onOpenChange(false);
  };

  const getLivenessMessage = () => {
    if (livenessChallenge === "blink") {
      return "Please blink 2-3 times naturally";
    } else if (livenessChallenge === "head_left") {
      return "Please turn your head slowly to the left";
    } else if (livenessChallenge === "head_right") {
      return "Please turn your head slowly to the right";
    }
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Register Your Face</DialogTitle>
          <DialogDescription>
            {step === "capture" && `We'll capture ${TARGET_IMAGES} images from different angles for better accuracy.`}
            {step === "liveness" && "Verify you're a real person by following the prompts."}
            {step === "review" && "Review and confirm registration."}
            {step === "uploading" && "Uploading your face data..."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Progress indicator */}
          {(step === "capture" || step === "liveness") && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {step === "capture" 
                    ? `Captured: ${capturedImages.length}/${TARGET_IMAGES} images`
                    : "Liveness verification in progress..."}
                </span>
                <span>{Math.round(((step === "capture" ? capturedImages.length : livenessFrames.length) / (step === "capture" ? TARGET_IMAGES : LIVENESS_FRAME_COUNT)) * 100)}%</span>
              </div>
              <Progress 
                value={step === "capture" 
                  ? (capturedImages.length / TARGET_IMAGES) * 100
                  : (livenessFrames.length / LIVENESS_FRAME_COUNT) * 100
                } 
                className="h-2"
              />
            </div>
          )}

          {(step === "capture" || step === "liveness") && (
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
                      faceDetected && step === "capture"
                        ? "border-green-500 bg-green-500/10"
                        : step === "liveness"
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-white/50 bg-black/50"
                    }`}
                  >
                    {step === "capture" && faceDetected ? (
                      <div className="text-green-500 text-sm text-center bg-black/50 px-3 py-1 rounded-full">
                        ✓ Face Detected ({Math.round(detectionConfidence * 100)}%)
                      </div>
                    ) : step === "liveness" ? (
                      <div className="text-blue-500 text-sm text-center bg-black/50 px-3 py-1 rounded-full">
                        {livenessChallenge === "blink" && <Eye className="h-6 w-6 mx-auto mb-1" />}
                        {(livenessChallenge === "head_left" || livenessChallenge === "head_right") && <Move3D className="h-6 w-6 mx-auto mb-1" />}
                        {getLivenessMessage()}
                      </div>
                    ) : (
                      <div className="text-white text-sm text-center bg-black/50 px-3 py-1 rounded-full">
                        Position Face Here
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">{statusMessage}</p>
              </div>

              {step === "capture" && (
                <Button
                  onClick={capturePhoto}
                  disabled={!faceDetected || isProcessing || capturedImages.length >= TARGET_IMAGES}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {capturedImages.length < TARGET_IMAGES 
                    ? `Capture Image ${capturedImages.length + 1}/${TARGET_IMAGES}`
                    : "All Images Captured"}
                </Button>
              )}
            </>
          )}

          {step === "review" && (
            <>
              <div className="grid grid-cols-4 gap-2 max-h-[400px] overflow-y-auto">
                {capturedImages.map((img, idx) => (
                  <div key={idx} className="relative aspect-video bg-black rounded overflow-hidden">
                    <img src={img} alt={`Capture ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center py-1">
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCapturedImages([]);
                    setCurrentImageIndex(0);
                    setStep("capture");
                    setStatusMessage("Position your face again");
                  }}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake All
                </Button>
                <Button
                  onClick={handleRegisterFace}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirm Registration
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {step === "uploading" && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-500" />
              <p className="text-lg font-semibold">{statusMessage}</p>
              <p className="text-sm text-gray-600 mt-2">This may take a few moments...</p>
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full"
            disabled={isProcessing && step === "uploading"}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
