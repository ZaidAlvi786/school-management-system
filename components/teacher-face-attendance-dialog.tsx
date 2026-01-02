"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface TeacherFaceAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function TeacherFaceAttendanceDialog({
  open,
  onOpenChange,
  onSuccess,
}: TeacherFaceAttendanceDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("Initializing...");
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const faceApiRef = useRef<any>(null);
  const consecutiveDetectionsRef = useRef(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadModels();
    } else {
      stopCamera();
      setCapturedImage(null);
      setError(null);
      setScanning(false);
      setIsProcessing(false);
    }
    return () => {
      stopCamera();
    };
  }, [open]);

  const loadModels = async () => {
    try {
      setStatusMessage("Loading models...");
      const faceapi = await import("face-api.js");
      faceApiRef.current = faceapi;

      const MODEL_URL = process.env.NODE_ENV === "production"
        ? "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
        : "/models";

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      ]);

      startCamera();
    } catch (err) {
      console.error("Error loading models:", err);
      // Fallback to manual mode if models fail
      toast({
        title: "Model Error",
        description: "Face detection models failed to load. You can still capture manually.",
        variant: "destructive",
      });
      startCamera();
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      setStatusMessage("Starting camera...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();

        // Start detection loop if models are loaded
        if (faceApiRef.current) {
          setScanning(true);
          startFaceDetection();
        } else {
          setStatusMessage("Ready to capture");
        }
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
      toast({
        title: "Camera Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const startFaceDetection = async () => {
    if (!videoRef.current || !faceApiRef.current) return;

    // Small delay to ensure video is ready
    await new Promise(resolve => setTimeout(resolve, 500));

    const detectFace = async () => {
      try {
        if (!videoRef.current || videoRef.current.readyState !== 4 || !faceApiRef.current || isProcessing || capturedImage) {
          return;
        }

        const faceapi = faceApiRef.current;
        const options = new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.3
        });

        const detection = await faceapi.detectSingleFace(videoRef.current, options);

        if (detection) {
          setStatusMessage("Face detected! Hold still...");
          consecutiveDetectionsRef.current += 1;

          if (consecutiveDetectionsRef.current > 5) {
            capturePhoto();
          }
        } else {
          setStatusMessage("Looking for face...");
          consecutiveDetectionsRef.current = 0;
        }
      } catch (err) {
        console.error("Face detection error:", err);
        consecutiveDetectionsRef.current = 0;
      }
    };

    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    detectionIntervalRef.current = setInterval(detectFace, 200);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      setCapturedImage(imageData);
      setScanning(false);

      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }

      toast({
        title: "Photo Captured",
        description: "Processing attendance...",
      });

      // Auto-submit after capture
      markAttendance(imageData);

    } catch (err: any) {
      console.error("Capture error:", err);
      toast({
        title: "Capture Failed",
        description: "Failed to capture photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setIsProcessing(false);
    setScanning(true);
    consecutiveDetectionsRef.current = 0;
    startFaceDetection();
  };

  const markAttendance = async (imageDataArg?: string) => {
    const imgData = imageDataArg || capturedImage;
    if (!imgData || isProcessing) return;

    try {
      setIsProcessing(true);
      setError(null);

      // Stop detection loop just in case
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }

      // Convert base64 image to blob
      const response = await fetch(imgData);
      const blob = await response.blob();

      // Create FormData
      const formData = new FormData();
      formData.append("faceImage", blob, "face.jpg");

      // Send to server
      const registerResponse = await fetch("/api/teacher/attendance/mark-face", {
        method: "POST",
        body: formData,
      });

      const data = await registerResponse.json();

      if (!registerResponse.ok) {
        throw new Error(data.error || "Failed to mark attendance");
      }

      toast({
        title: "Success!",
        description: data.isLate
          ? `Attendance marked! You were ${data.lateMinutes} minutes late.`
          : "Attendance marked successfully!",
        className: "bg-green-500 text-white",
      });

      stopCamera();

      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 1500);

    } catch (err: any) {
      console.error("Attendance error:", err);
      const errorMsg = err.message || "Failed to mark attendance.";
      setError(errorMsg);
      toast({
        title: "Attendance Failed",
        description: errorMsg,
        variant: "destructive",
      });
      // Allow retry
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
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Mark Attendance</DialogTitle>
          <DialogDescription>
            Position your face in the circle. The system will automatically scan and mark your attendance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {!capturedImage ? (
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
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`border-2 rounded-full w-48 h-48 flex items-center justify-center transition-colors ${scanning ? 'border-green-500/50' : 'border-white/50'}`}>
                    <div className="text-white text-sm text-center bg-black/50 px-3 py-1 rounded-full">
                      {statusMessage}
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual capture button fallback */}
              {!scanning && !isProcessing && (
                <Button
                  onClick={capturePhoto}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capture Manually
                </Button>
              )}
            </>
          ) : (
            <>
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

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button
                  onClick={() => markAttendance()}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Confirm Attendance"}
                </Button>
              </div>
            </>
          )}

          <Button
            variant="ghost"
            onClick={handleClose}
            className="w-full"
            disabled={isProcessing}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
