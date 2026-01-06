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

interface FaceAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  classId?: string; // Required for students
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("Initializing...");
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
        setStatusMessage("Position your face in the frame");
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError("Failed to access camera. Please allow camera permissions.");
      setStatusMessage("Camera error");
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

      if (!classId && session.user.role === "student") {
        throw new Error("Class ID is required for students");
      }

      // Mark attendance via FastAPI
      const result = await markAttendance(
        imgData,
        session.user.role as "student" | "teacher",
        classId,
        "web"
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
        description: result.message,
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCapturedImage(null);
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
            Position your face in the circle. The system will automatically scan and mark your attendance when ready.
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
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-center text-white">
                      <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Position your face in the frame</p>
                    </div>
                  </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-gray-600">
                  {statusMessage}
                </span>
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
                  onClick={capturePhoto}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
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

