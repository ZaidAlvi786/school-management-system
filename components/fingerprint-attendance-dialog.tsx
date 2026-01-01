"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Fingerprint, CheckCircle2, AlertCircle } from "lucide-react";

interface FingerprintAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userType?: "student" | "teacher"; // Default to student
}

export default function FingerprintAttendanceDialog({
  open,
  onOpenChange,
  onSuccess,
  userType = "student",
}: FingerprintAttendanceDialogProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if WebAuthn is supported
  const isWebAuthnSupported = () => {
    return typeof window !== "undefined" && 
           typeof window.PublicKeyCredential !== "undefined" &&
           typeof navigator.credentials !== "undefined" &&
           typeof navigator.credentials.get !== "undefined";
  };

  const scanAndMarkAttendance = async () => {
    if (!isWebAuthnSupported()) {
      setError("Fingerprint authentication is not supported on this device.");
      return;
    }

    try {
      setScanning(true);
      setError(null);
      setSuccess(false);

      // Step 1: Get challenge from server
      const apiPrefix = userType === "teacher" ? "/api/teacher" : "/api/student";
      const challengeResponse = await fetch(`${apiPrefix}/fingerprint/attendance-challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!challengeResponse.ok) {
        const errorData = await challengeResponse.json();
        throw new Error(errorData.error || "Failed to start authentication");
      }

      const { challenge, credentialId, publicKey } = await challengeResponse.json();

      // Step 2: Authenticate using WebAuthn API
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: Uint8Array.from(challenge, (c: string) => c.charCodeAt(0)),
        allowCredentials: [{
          id: Uint8Array.from(credentialId, (c: number) => c),
          type: "public-key",
        }],
        timeout: 60000,
        userVerification: "required",
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new Error("Authentication failed");
      }

      const response = assertion.response as AuthenticatorAssertionResponse;

      // Step 3: Verify and mark attendance
      const attendanceResponse = await fetch(`${apiPrefix}/fingerprint/mark-attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialId: Array.from(new Uint8Array(assertion.rawId)),
          authenticatorData: Array.from(new Uint8Array(response.authenticatorData)),
          clientDataJSON: Array.from(new Uint8Array(response.clientDataJSON)),
          signature: Array.from(new Uint8Array(response.signature)),
          userHandle: response.userHandle ? Array.from(new Uint8Array(response.userHandle)) : null,
        }),
      });

      const data = await attendanceResponse.json();

      if (!attendanceResponse.ok) {
        if (data.alreadyMarked) {
          setError("Attendance already marked for today.");
        } else {
          setError(data.error || "Authentication failed. Please try again.");
        }
        setScanning(false);
        return;
      }

      // Success
      setSuccess(true);
      
      // Auto close after 2 seconds
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      console.error("Error marking attendance:", err);
      if (err.name === "NotAllowedError") {
        setError("Authentication was cancelled. Please try again.");
      } else if (err.name === "NotSupportedError") {
        setError("Fingerprint authentication is not supported on this device.");
      } else if (err.name === "SecurityError") {
        setError("Security error. Please make sure you're using HTTPS or localhost.");
      } else {
        setError(err.message || "Failed to mark attendance. Please try again.");
      }
    } finally {
      setScanning(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(false);
    onOpenChange(false);
  };

  if (!isWebAuthnSupported()) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Fingerprint Attendance</DialogTitle>
            <DialogDescription>
              Mark your attendance using fingerprint authentication.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Not Supported</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Fingerprint authentication is not supported on this device or browser.
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] z-[100]">
        <DialogHeader>
          <DialogTitle>Mark Attendance with Fingerprint</DialogTitle>
          <DialogDescription>
            Authenticate using your registered fingerprint or face ID to mark your attendance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Attendance marked successfully!</span>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className={`p-6 rounded-full transition-colors ${
              success 
                ? "bg-gradient-to-br from-green-100 to-emerald-100" 
                : scanning
                ? "bg-gradient-to-br from-blue-100 to-cyan-100 animate-pulse"
                : "bg-gradient-to-br from-blue-100 to-cyan-100"
            }`}>
              <Fingerprint className={`h-12 w-12 ${
                success ? "text-green-600" : "text-blue-600"
              }`} />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {success 
                  ? "Attendance marked successfully!"
                  : scanning 
                  ? "Follow the prompts on your device to authenticate..."
                  : "Click the button below to authenticate and mark attendance"}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={scanning || success}
            >
              Cancel
            </Button>
            <Button
              onClick={scanAndMarkAttendance}
              disabled={scanning || success}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {scanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Success
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4 mr-2" />
                  Scan & Mark Attendance
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

