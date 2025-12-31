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
import { Loader2, Camera, CheckCircle2 } from "lucide-react";

interface FaceRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function FaceRegistrationDialog({
  open,
  onOpenChange,
  onSuccess,
}: FaceRegistrationDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      loadModels();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadModels = async () => {
    try {
      setLoading(true);
      setError(null);

      // Dynamically import face-api.js only on client side
      // Use dynamic import with proper error handling
      const faceapi = await import("face-api.js").catch((err) => {
        console.error("Failed to load face-api.js:", err);
        throw new Error("Face recognition library failed to load. Please refresh the page.");
      });

      // Load models from CDN (for production on Vercel)
      // Alternative: Use "/models" for local development if you download models
      const MODEL_URL = process.env.NODE_ENV === "production" 
        ? "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
        : "/models";
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      setModelsLoaded(true);
      startCamera();
    } catch (err: any) {
      console.error("Error loading models:", err);
      setError("Failed to load face recognition models. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: "user" 
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
        startFaceDetection();
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError("Failed to access camera. Please allow camera permissions.");
    }
  };

  const startFaceDetection = async () => {
    if (!videoRef.current || !modelsLoaded) return;

    const detectFace = async () => {
      try {
        const faceapi = await import("face-api.js");
        const detections = await faceapi
          .detectSingleFace(
            videoRef.current!,
            new faceapi.TinyFaceDetectorOptions()
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detections) {
          setFaceDetected(true);
          drawFaceDetection(detections);
        } else {
          setFaceDetected(false);
          clearCanvas();
        }
      } catch (err) {
        console.error("Face detection error:", err);
      }
    };

    detectionIntervalRef.current = setInterval(detectFace, 100);
  };

  const drawFaceDetection = (detection: any) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw face bounding box
    const box = detection.detection.box;
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const radius = Math.max(box.width, box.height) / 2;

    // Draw circle guide
    ctx.strokeStyle = faceDetected ? "#22c55e" : "#e5e7eb";
    ctx.lineWidth = 3;
    ctx.setLineDash(faceDetected ? [0] : [10, 5]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw face box
    ctx.strokeStyle = faceDetected ? "#22c55e" : "#6b7280";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(box.x, box.y, box.width, box.height);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const captureAndRegister = async () => {
    if (!videoRef.current || !faceDetected || capturing) return;

    try {
      setCapturing(true);
      setIsProcessing(true);
      setError(null);

      const faceapi = await import("face-api.js");
      
      // Get face descriptor
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError("No face detected. Please position your face in the frame.");
        setIsProcessing(false);
        setCapturing(false);
        return;
      }

      // Extract descriptor (128-dimensional vector)
      const faceDescriptor = Array.from(detection.descriptor);

      // Register face
      const response = await fetch("/api/student/face/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceEncoding: faceDescriptor }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register face");
      }

      // Success
      stopCamera();
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error registering face:", err);
      setError(err.message || "Failed to register face. Please try again.");
    } finally {
      setIsProcessing(false);
      setCapturing(false);
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

    clearCanvas();
    setFaceDetected(false);
  };

  const handleClose = () => {
    stopCamera();
    setError(null);
    setModelsLoaded(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Register Your Face</DialogTitle>
          <DialogDescription>
            Position your face in the circle and keep the camera steady. When the border turns green, click &quot;Capture &amp; Register&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2">Loading face recognition models...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {!loading && modelsLoaded && (
            <>
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ pointerEvents: "none" }}
                />
                {!faceDetected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-center text-white">
                      <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Position your face in the frame</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    faceDetected ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {faceDetected ? "Face detected - Keep steady!" : "Waiting for face..."}
                </span>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={capturing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={captureAndRegister}
                  disabled={!faceDetected || capturing}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Capture & Register
                    </>
                  )}
                </Button>
              </div>

              {faceDetected && !capturing && (
                <p className="text-xs text-center text-gray-500">
                  Keep your face steady and click the button above to register
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

