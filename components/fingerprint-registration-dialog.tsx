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

interface FingerprintRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function FingerprintRegistrationDialog({
  open,
  onOpenChange,
  onSuccess,
}: FingerprintRegistrationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  // Check if WebAuthn is supported
  const isWebAuthnSupported = () => {
    return typeof window !== "undefined" && 
           typeof window.PublicKeyCredential !== "undefined" &&
           typeof navigator.credentials !== "undefined" &&
           typeof navigator.credentials.create !== "undefined";
  };

  const registerFingerprint = async () => {
    if (!isWebAuthnSupported()) {
      setError("Fingerprint authentication is not supported on this device. Please use a device with biometric authentication (fingerprint or face unlock).");
      return;
    }

    try {
      setRegistering(true);
      setError(null);

      // Step 1: Get challenge from server
      const challengeResponse = await fetch("/api/student/fingerprint/register-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!challengeResponse.ok) {
        const errorData = await challengeResponse.json();
        throw new Error(errorData.error || "Failed to start registration");
      }

      const { challenge, userId } = await challengeResponse.json();

      // Step 2: Create credential using WebAuthn API
      // Use hostname directly - works for localhost, Vercel domains, and custom domains
      // WebAuthn requires exact domain match, so we use the current hostname
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: Uint8Array.from(challenge, (c: string) => c.charCodeAt(0)),
        rp: {
          name: "School Management System",
          id: window.location.hostname, // Works for localhost, vercel.app, and custom domains
        },
        user: {
          id: Uint8Array.from(userId, (c: string) => c.charCodeAt(0)),
          name: "student",
          displayName: "Student",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Use device's built-in authenticator
          userVerification: "required",
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: "direct",
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error("Failed to create credential");
      }

      const response = credential.response as AuthenticatorAttestationResponse;

      // Step 3: Send credential to server for storage
      const registerResponse = await fetch("/api/student/fingerprint/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialId: Array.from(new Uint8Array(credential.rawId)),
          publicKey: response.getPublicKey() ? Array.from(new Uint8Array(response.getPublicKey()!)) : [],
          clientDataJSON: Array.from(new Uint8Array(response.clientDataJSON)),
          attestationObject: Array.from(new Uint8Array(response.attestationObject)),
        }),
      });

      const data = await registerResponse.json();

      if (!registerResponse.ok) {
        throw new Error(data.error || "Failed to register fingerprint");
      }

      // Success
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error registering fingerprint:", err);
      if (err.name === "NotAllowedError") {
        setError("Registration was cancelled or not allowed. Please try again and follow the prompts on your device.");
      } else if (err.name === "NotSupportedError") {
        setError("Fingerprint authentication is not supported on this device.");
      } else if (err.name === "SecurityError") {
        setError("Security error. Please make sure you're using HTTPS or localhost.");
      } else {
        setError(err.message || "Failed to register fingerprint. Please try again.");
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  if (!isWebAuthnSupported()) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Fingerprint Registration</DialogTitle>
            <DialogDescription>
              Register your fingerprint for quick attendance marking.
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
                    Please use a device with biometric authentication (fingerprint or face unlock) 
                    and a modern browser that supports WebAuthn.
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
          <DialogTitle>Register Your Fingerprint</DialogTitle>
          <DialogDescription>
            Register your fingerprint or face ID for quick attendance marking. 
            You&apos;ll be prompted to authenticate using your device&apos;s biometric sensor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="p-6 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full">
              <Fingerprint className="h-12 w-12 text-blue-600" />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {registering 
                  ? "Follow the prompts on your device to register your fingerprint..."
                  : "Click the button below to start fingerprint registration"}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={registering}
            >
              Cancel
            </Button>
            <Button
              onClick={registerFingerprint}
              disabled={registering}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              {registering ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4 mr-2" />
                  Register Fingerprint
                </>
              )}
            </Button>
          </div>

          {!registering && (
            <p className="text-xs text-center text-gray-500">
              Make sure your device has fingerprint or face unlock enabled
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

