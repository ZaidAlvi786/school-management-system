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

interface TeacherFaceAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Face detection helper
function detectFaceInImage(imageData: string): Promise<{ detected: boolean; quality: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ detected: false, quality: 0 });
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageDataObj.data;
      
      let totalBrightness = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        totalBrightness += (r + g + b) / 3;
      }
      const avgBrightness = totalBrightness / (pixels.length / 4);

      const quality = avgBrightness > 50 && avgBrightness < 230 ? 80 : 40;
      resolve({ detected: true, quality });
    };
    img.onerror = () => resolve({ detected: false, quality: 0 });
    img.src = imageData;
  });
}

export default function TeacherFaceAttendanceDialog({
  open,
  onOpenChange,
  onSuccess,
}: TeacherFaceAttendanceDialogProps) {
  const { data: session } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("Initializing camera...");
  const [faceDetected, setFaceDetected] = useState(false);
  const [imageQuality, setImageQuality] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setError(null);
      setIsProcessing(false);
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
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 16 / 9 }
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
        setStatusMessage("Position your face in the frame");
        startFaceDetection();
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      let errorMsg = "Failed to access camera.";
      if (err.name === "NotAllowedError") {
        errorMsg = "Camera permission denied. Please allow camera access.";
      } else if (err.name === "NotFoundError") {
        errorMsg = "No camera found on your device.";
      } else if (err.name === "NotReadableError") {
        errorMsg = "Camera is being used by another application.";
      }
      setError(errorMsg);
      toast({
        title: "Camera Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const startFaceDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    detectionIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || isProcessing) return;

      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        
        ctx.drawImage(video, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        let totalBrightness = 0;
        let minBrightness = 255;
        let maxBrightness = 0;
        
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const brightness = (r + g + b) / 3;
          totalBrightness += brightness;
          minBrightness = Math.min(minBrightness, brightness);
          maxBrightness = Math.max(maxBrightness, brightness);
        }
        
        const avgBrightness = totalBrightness / (pixels.length / 4);
        const contrast = maxBrightness - minBrightness;
        
        let quality = 50;
        if (avgBrightness > 50 && avgBrightness < 230) quality += 20;
        if (contrast > 30) quality += 20;
        if (canvas.width >= 640 && canvas.height >= 480) quality += 10;
        
        setImageQuality(quality);
        
        const detected = quality > 60;
        setFaceDetected(detected);
        
        if (detected) {
          setStatusMessage("Face detected! Ready to capture.");
        } else if (quality < 40) {
          setStatusMessage("Improve lighting and position your face clearly");
        } else {
          setStatusMessage("Position your face in the center of the frame");
        }
      } catch (err) {
        console.error("Face detection error:", err);
      }
    }, 500);
  }, [isProcessing]);

  const capturePhoto = async () => {
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
      
      const detection = await detectFaceInImage(imageData);
      
      if (!detection.detected || detection.quality < 50) {
        toast({
          title: "Poor Image Quality",
          description: "Please ensure good lighting and a clear view of your face.",
          variant: "destructive",
        });
        return;
      }
      
      setCapturedImage(imageData);
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

  const retakePhoto = () => {
    setCapturedImage(null);
    setIsProcessing(false);
  };

  const markAttendanceFromImage = async (imageDataArg?: string) => {
    const imgData = imageDataArg || capturedImage;
    if (!imgData || isProcessing || !session?.user) return;

    try {
      setIsProcessing(true);
      setError(null);

      const result = await markAttendance(
        imgData,
        "teacher",
        undefined,
        "web"
      );

      if (result.already_marked) {
        toast({
          title: "Already Marked",
          description: "Attendance already marked for today.",
          variant: "default",
        });
        stopCamera();
        setTimeout(() => {
          onSuccess();
          onOpenChange(false);
        }, 1500);
        return;
      }

      toast({
        title: "Success!",
        description: result.is_late
          ? `Attendance marked! You were ${result.late_minutes} minutes late. ${result.confidence ? `(Confidence: ${(result.confidence * 100).toFixed(1)}%)` : ""}`
          : result.message + (result.confidence ? ` (Confidence: ${(result.confidence * 100).toFixed(1)}%)` : ""),
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
    setFaceDetected(false);
    setImageQuality(0);
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
            Position your face in the center. The system will automatically detect your face and mark attendance.
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
                  <div className={`border-2 rounded-full w-48 h-48 flex items-center justify-center transition-all ${
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

                {imageQuality > 0 && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    Quality: {imageQuality}%
                  </div>
                )}
              </div>

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

              <Button
                onClick={capturePhoto}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 disabled:opacity-50"
                disabled={isProcessing || (!faceDetected && imageQuality < 60)}
              >
                <Camera className="h-4 w-4 mr-2" />
                {isProcessing ? "Processing..." : "Capture Photo"}
              </Button>
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
                  onClick={() => markAttendanceFromImage()}
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
