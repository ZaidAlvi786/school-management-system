"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      // Sign out without redirect first to ensure session is cleared
      await signOut({ 
        redirect: false
      });
      
      // Clear any cached data
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      // Force a hard redirect to login page to ensure session is cleared
      // Using window.location ensures a full page reload and clears all cached data
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback: Force redirect to login page
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/login";
      } else {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleLogout}
      disabled={loading}
      className="hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
    >
      <LogOut className="mr-2 h-4 w-4" />
      {loading ? "Logging out..." : "Logout"}
    </Button>
  );
}

