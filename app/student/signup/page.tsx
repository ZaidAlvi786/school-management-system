"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { BookOpen, Lock, Mail, Loader2, ArrowRight, Sparkles, User, Phone } from "lucide-react";
import Link from "next/link";

export default function StudentSignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          role: "student",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Success",
          description: data.message || "Account created successfully!",
        });
        router.push("/student/login");
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create account",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-orange-600 via-amber-700 to-yellow-800 animate-gradient py-12 px-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: "2s" }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: "4s" }}></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-30 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <Card className="backdrop-blur-xl bg-white/95 shadow-2xl border-0 animate-slide-up">
          <CardHeader className="space-y-4 pb-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl blur-lg opacity-50 animate-pulse-glow"></div>
                <div className="relative p-4 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl transform hover:scale-110 transition-transform duration-300">
                  <BookOpen className="h-10 w-10 text-white" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Create Student Account
                </CardTitle>
                <CardDescription className="text-base">
                  Start your learning journey
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ahmed Ali"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  className={`transition-all duration-300 ${
                    focusedField === "name"
                      ? "ring-2 ring-orange-500 border-orange-500 shadow-lg"
                      : "border-gray-200"
                  }`}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <div className="relative group">
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@school.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    className={`pl-10 transition-all duration-300 ${
                      focusedField === "email"
                        ? "ring-2 ring-orange-500 border-orange-500 shadow-lg"
                        : "border-gray-200"
                    }`}
                    required
                  />
                  <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${
                    focusedField === "email" ? "text-orange-500" : "text-gray-400"
                  }`} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number (Optional)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+92-300-1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  onFocus={() => setFocusedField("phone")}
                  onBlur={() => setFocusedField(null)}
                  className={`transition-all duration-300 ${
                    focusedField === "phone"
                      ? "ring-2 ring-orange-500 border-orange-500 shadow-lg"
                      : "border-gray-200"
                  }`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password
                </Label>
                <div className="relative group">
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    className={`pl-10 transition-all duration-300 ${
                      focusedField === "password"
                        ? "ring-2 ring-orange-500 border-orange-500 shadow-lg"
                        : "border-gray-200"
                    }`}
                    required
                  />
                  <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${
                    focusedField === "password" ? "text-orange-500" : "text-gray-400"
                  }`} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Confirm Password
                </Label>
                <div className="relative group">
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    onFocus={() => setFocusedField("confirmPassword")}
                    onBlur={() => setFocusedField(null)}
                    className={`pl-10 transition-all duration-300 ${
                      focusedField === "confirmPassword"
                        ? "ring-2 ring-orange-500 border-orange-500 shadow-lg"
                        : "border-gray-200"
                    }`}
                    required
                  />
                  <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${
                    focusedField === "confirmPassword" ? "text-orange-500" : "text-gray-400"
                  }`} />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 h-12 text-base font-semibold group"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Already have an account?</span>
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/student/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:gap-3 transition-all duration-300 group"
              >
                <ArrowRight className="h-4 w-4 group-hover:-translate-x-1 transition-transform rotate-180" />
                Sign in instead
                <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

