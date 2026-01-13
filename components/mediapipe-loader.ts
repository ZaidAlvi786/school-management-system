/**
 * MediaPipe Loader Utility
 * Loads MediaPipe from CDN dynamically
 */

declare global {
  interface Window {
    FaceDetector: any;
    FilesetResolver: any;
  }
}

export async function loadMediaPipe(): Promise<{ FaceDetector: any; FilesetResolver: any } | null> {
  // Check if already loaded
  if (window.FaceDetector && window.FilesetResolver) {
    return {
      FaceDetector: window.FaceDetector,
      FilesetResolver: window.FilesetResolver,
    };
  }

  try {
    // Load MediaPipe script
    const script = document.createElement("script");
    script.type = "module";
    script.textContent = `
      import { FaceDetector, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest';
      window.FaceDetector = FaceDetector;
      window.FilesetResolver = FilesetResolver;
    `;
    
    document.head.appendChild(script);

    // Wait for MediaPipe to load
    let attempts = 0;
    while (!window.FaceDetector && attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (window.FaceDetector && window.FilesetResolver) {
      return {
        FaceDetector: window.FaceDetector,
        FilesetResolver: window.FilesetResolver,
      };
    }

    return null;
  } catch (error) {
    console.error("Failed to load MediaPipe:", error);
    return null;
  }
}
