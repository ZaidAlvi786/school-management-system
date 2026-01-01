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
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setError(null);
    }
    return () => {
      stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    try {
      setError(null);
      
      toast({
        title: "Starting Camera",
        description: "Please allow camera access...",
      });

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
        
        toast({
          title: "Camera Ready",
          description: "Position your face in the frame and click Capture",
        });
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      let errorMsg = "Failed to access camera.";
      if (err.name === "NotAllowedError") {
        errorMsg = "Camera permission denied. Please allow camera access in browser settings.";
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
    if (!videoRef.current || !canvasRef.current) return;

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
        description: "Review your photo and click Mark Attendance if it looks good",
      });
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
    toast({
      title: "Retake Photo",
      description: "Position your face again and click Capture",
    });
  };

  const markAttendance = async () => {
    if (!capturedImage || isProcessing) return;

    try {
      setIsProcessing(true);
      setError(null);

      toast({
        title: "Processing",
        description: "Marking your attendance...",
      });

      // Convert base64 image to blob
      const response = await fetch(capturedImage);
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
      });

      stopCamera();
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Attendance error:", err);
      const errorMsg = err.message || "Failed to mark attendance. Please try again.";
      setError(errorMsg);
      toast({
        title: "Attendance Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
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
            Take a clear photo of your face to mark attendance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
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
                  <div className="border-2 border-white/50 rounded-full w-48 h-48 flex items-center justify-center">
                    <div className="text-white text-sm text-center">
                      Position face here
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={capturePhoto}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
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
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Retake
                </Button>
                <Button
                  onClick={markAttendance}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Marking...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Attendance
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          <Button
            variant="outline"
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

