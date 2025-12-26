"use client";

import { ReactNode } from "react";
import Sidebar from "./sidebar";
import LoadingSpinner from "./loading-spinner";

interface PageLayoutProps {
  children: ReactNode;
  loading?: boolean;
}

export default function PageLayout({ children, loading = false }: PageLayoutProps) {
  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}





