"use client";

import { ReactNode } from "react";
import Sidebar from "./sidebar";

interface PageWrapperProps {
  children: ReactNode;
}

export default function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}







