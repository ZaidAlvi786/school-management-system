"use client";

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-8 h-8 border-4 border-cyan-200 border-t-cyan-500 rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
        </div>
      </div>
    </div>
  );
}

