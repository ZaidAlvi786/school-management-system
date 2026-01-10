"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
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
import { markAttendance } from "@/lib/fastapi-client";

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
  const { data: session } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("Initializing...");
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
        setStatusMessage("Ready to capture");
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

      toast({
        title: "Photo Captured",
        description: "Processing attendance...",
      });

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

      // Mark attendance via FastAPI
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
          ? `Attendance marked! You were ${result.late_minutes} minutes late.`
          : result.message,
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
                  <div className="border-2 rounded-full w-48 h-48 flex items-center justify-center border-white/50">
                    <div className="text-white text-sm text-center bg-black/50 px-3 py-1 rounded-full">
                      {statusMessage}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={capturePhoto}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                disabled={isProcessing}
              >
                <Camera className="h-4 w-4 mr-2" />
                Capture Photo
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
