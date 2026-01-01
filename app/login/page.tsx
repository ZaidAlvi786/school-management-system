"use client";

import React, { useState, useEffect, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Lock, Mail, Loader2, ArrowRight, LogIn, UserPlus, User, Phone, Building2, GraduationCap, BookOpen, Users, Check, X, Upload, FileText, Sparkles } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const { data: session, status, update } = useSession();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const hasRedirected = useRef(false);

  // Signup states
  const [selectedRole, setSelectedRole] = useState<"admin" | "principal" | "teacher" | "student" | "parent" | "">("");
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainAvailable, setDomainAvailable] = useState<boolean | null>(null);
  const [certificateType, setCertificateType] = useState<"upload" | "number">("number");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    userName: "",
    domain: "",
    password: "",
    confirmPassword: "",
    phone: "",
    schoolName: "",
    schoolCode: "",
    address: "",
    city: "",
    province: "",
    schoolType: "government",
    certificateNumber: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: "Error",
          description: "Invalid email or password",
          variant: "destructive",
        });
        setLoading(false);
      } else {
        // Update session to refresh it
        await update();
        
        // Wait a moment for session to update, then check and redirect
        setTimeout(async () => {
          try {
            const sessionResponse = await fetch('/api/auth/session');
            const sessionData = await sessionResponse.json();
            
            if (sessionData?.user?.role) {
              hasRedirected.current = true;
              const role = sessionData.user.role;
              
              toast({
                title: "Success",
                description: "Logged in successfully",
              });
              
              // Redirect based on role using window.location for reliable redirect
              if (role === "admin") {
                window.location.href = "/admin";
              } else if (role === "principal") {
                window.location.href = "/principal";
              } else if (role === "teacher") {
                window.location.href = "/teacher";
              } else if (role === "student") {
                window.location.href = "/student";
              } else if (role === "parent") {
                window.location.href = "/parent";
              } else {
                router.refresh();
              }
            } else {
              // Fallback: refresh and let useEffect handle redirect
              router.refresh();
            }
          } catch (err) {
            // Fallback: refresh and let useEffect handle redirect
            router.refresh();
          }
          setLoading(false);
        }, 300);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Check domain availability (only for admin)
  const checkDomain = async (domain: string) => {
    if (!domain || domain.length < 3 || selectedRole !== "admin") {
      setDomainAvailable(null);
      return;
    }

    setCheckingDomain(true);
    try {
      const res = await fetch(`/api/auth/check-domain?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      if (res.ok) {
        setDomainAvailable(data.available);
      } else {
        setDomainAvailable(false);
      }
    } catch (error) {
      setDomainAvailable(false);
    } finally {
      setCheckingDomain(false);
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (hasRedirected.current) return;
    
    if (status === "authenticated" && session?.user?.role) {
      hasRedirected.current = true;
      const role = session.user.role;
      
      // Small delay to ensure session is fully established
      setTimeout(() => {
        if (role === "admin") {
          router.push("/admin");
        } else if (role === "principal") {
          router.push("/principal");
        } else if (role === "teacher") {
          router.push("/teacher");
        } else if (role === "student") {
          router.push("/student");
        } else if (role === "parent") {
          router.push("/parent");
        }
      }, 100);
    }
  }, [status, session, router]);

  // Debounced domain check
  useEffect(() => {
    if (selectedRole === "admin" && signupData.domain) {
      const timeoutId = setTimeout(() => {
        checkDomain(signupData.domain);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [signupData.domain, selectedRole]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF or image file (JPEG, PNG)",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole) {
      toast({
        title: "Error",
        description: "Please select a user role",
        variant: "destructive",
      });
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (signupData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (selectedRole === "admin") {
      if (domainAvailable === false) {
        toast({
          title: "Error",
          description: "Please choose a different domain",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      if (selectedRole === "admin") {
        const submitFormData = new FormData();
        submitFormData.append("name", signupData.name);
        submitFormData.append("userName", signupData.userName);
        submitFormData.append("domain", signupData.domain);
        submitFormData.append("password", signupData.password);
        submitFormData.append("phone", signupData.phone);
        submitFormData.append("schoolName", signupData.schoolName);
        submitFormData.append("schoolCode", signupData.schoolCode);
        submitFormData.append("address", signupData.address);
        submitFormData.append("city", signupData.city);
        submitFormData.append("province", signupData.province);
        submitFormData.append("schoolType", signupData.schoolType);
        submitFormData.append("certificateType", certificateType);
        submitFormData.append("certificateNumber", signupData.certificateNumber);
        if (selectedFile) {
          submitFormData.append("certificateFile", selectedFile);
        }

        const res = await fetch("/api/auth/admin-signup", {
          method: "POST",
          body: submitFormData,
        });

        const data = await res.json();
        if (res.ok) {
          toast({
            title: "Success",
            description: data.message || "Account created successfully!",
          });
          setIsSignUp(false);
          setEmail(`${signupData.userName}@${signupData.domain}`);
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to create account",
            variant: "destructive",
          });
        }
      } else {
        // For principal, teacher, student, parent - use general signup
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: signupData.name,
            email: signupData.email,
            password: signupData.password,
            phone: signupData.phone,
            role: selectedRole,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          toast({
            title: "Success",
            description: data.message || "Account created successfully!",
          });
          setIsSignUp(false);
          setEmail(signupData.email);
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to create account",
            variant: "destructive",
          });
        }
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

  const generatedEmail = selectedRole === "admin" && signupData.userName && signupData.domain 
    ? `${signupData.userName.toLowerCase()}@${signupData.domain.toLowerCase()}`
    : "";

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="relative w-full h-full max-w-[1100px] max-h-[650px] bg-white rounded-2xl shadow-2xl overflow-hidden flex">
        {/* Sign In Form - Left Side */}
        <div className={`absolute left-0 top-0 w-1/2 h-full p-12 transition-transform duration-700 ease-in-out ${isSignUp ? '-translate-x-full' : 'translate-x-0'}`}>
          <form onSubmit={handleLogin} className="h-full flex flex-col justify-center">
            <h2 className="text-3xl font-bold text-center mb-10 text-gray-800">Sign In</h2>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="login-email" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    className={`pl-12 h-14 bg-blue-50 border-2 rounded-xl transition-all outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
                      focusedField === "email" 
                        ? "border-blue-500 bg-blue-100" 
                        : "border-blue-200"
                    }`}
                    placeholder="admin@school.com"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="login-password" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    className={`pl-12 h-14 bg-blue-50 border-2 rounded-xl transition-all outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
                      focusedField === "password" 
                        ? "border-blue-500 bg-blue-100" 
                        : "border-blue-200"
                    }`}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-10 h-14 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign In
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Sign Up Form - Right Side (Hidden initially) */}
        <div className={`absolute right-0 top-0 w-1/2 h-full p-12 transition-transform duration-700 ease-in-out ${isSignUp ? 'translate-x-0' : 'translate-x-full'}`}>
          <form onSubmit={handleSignup} className="h-full flex flex-col">
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Sign Up</h2>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {/* Role Selection */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Select Your Role *</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) => {
                    setSelectedRole(value as typeof selectedRole);
                    setSignupData({
                      name: "",
                      email: "",
                      userName: "",
                      domain: "",
                      password: "",
                      confirmPassword: "",
                      phone: "",
                      schoolName: "",
                      schoolCode: "",
                      address: "",
                      city: "",
                      province: "",
                      schoolType: "government",
                      certificateNumber: "",
                    });
                    setSelectedFile(null);
                    setDomainAvailable(null);
                  }}
                >
                  <SelectTrigger className="h-14 bg-blue-50 border-2 border-blue-200 rounded-xl focus:border-blue-500 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                    <SelectValue placeholder="Choose your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Admin
                      </div>
                    </SelectItem>
                    <SelectItem value="principal">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Principal
                      </div>
                    </SelectItem>
                    <SelectItem value="teacher">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Teacher
                      </div>
                    </SelectItem>
                    <SelectItem value="student">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Student
                      </div>
                    </SelectItem>
                    <SelectItem value="parent">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Parent
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedRole && (
                <>
                  {selectedRole === "admin" ? (
                    <>
                      <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">Username *</Label>
                        <Input
                          value={signupData.userName}
                          onChange={(e) => setSignupData({ ...signupData, userName: e.target.value })}
                          className="h-14 bg-blue-50 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:bg-blue-100 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                          placeholder="admin"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">Domain *</Label>
                        <div className="relative">
                          <Input
                            value={signupData.domain}
                            onChange={(e) => setSignupData({ ...signupData, domain: e.target.value.toLowerCase() })}
                            className="h-14 bg-blue-50 border-2 border-blue-200 rounded-xl pr-10 focus:border-blue-500 focus:bg-blue-100 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            placeholder="school.com"
                            required
                          />
                          {checkingDomain && <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-blue-500" />}
                          {!checkingDomain && signupData.domain && domainAvailable !== null && (
                            <button
                              type="button"
                              onClick={() => setSignupData({ ...signupData, domain: "" })}
                              className="absolute right-4 top-1/2 transform -translate-y-1/2"
                            >
                              {domainAvailable ? (
                                <Check className="h-5 w-5 text-green-600" />
                              ) : (
                                <X className="h-5 w-5 text-red-600" />
                              )}
                            </button>
                          )}
                        </div>
                        {signupData.domain && domainAvailable !== null && (
                          <p className={`text-xs mt-1 ${domainAvailable ? "text-green-600" : "text-red-600"}`}>
                            {domainAvailable ? "✓ Domain available" : "✗ Domain already taken"}
                          </p>
                        )}
                      </div>
                      {generatedEmail && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                          <p className="text-sm text-gray-700">Your email will be: <span className="font-semibold text-blue-600">{generatedEmail}</span></p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">Email Address *</Label>
                      <Input
                        type="email"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        className="h-14 bg-blue-50 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:bg-blue-100 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder={`${selectedRole}@school.com`}
                        required
                      />
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Name *</Label>
                    <Input
                      value={signupData.name}
                      onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                      className="h-14 bg-blue-50 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:bg-blue-100 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="Full Name"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Phone</Label>
                    <Input
                      type="tel"
                      value={signupData.phone}
                      onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                      className="h-14 bg-blue-50 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:bg-blue-100 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="+92-300-1234567"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Password *</Label>
                    <Input
                      type="password"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      className="h-14 bg-blue-50 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:bg-blue-100 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Confirm Password *</Label>
                    <Input
                      type="password"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                      className="h-14 bg-blue-50 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:bg-blue-100 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>

                  {/* Admin-specific fields */}
                  {selectedRole === "admin" && (
                    <>
                      <div className="border-t pt-4 space-y-4">
                        <h3 className="font-semibold text-gray-800">School Information</h3>
                        <div>
                          <Label className="text-sm font-semibold text-gray-700 mb-2 block">School Name *</Label>
                          <Input
                            value={signupData.schoolName}
                            onChange={(e) => setSignupData({ ...signupData, schoolName: e.target.value })}
                            className="h-14 bg-blue-50 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:bg-blue-100 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            required
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-gray-700 mb-2 block">School Code *</Label>
                          <Input
                            value={signupData.schoolCode}
                            onChange={(e) => setSignupData({ ...signupData, schoolCode: e.target.value })}
                            className="h-14 bg-blue-50 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:bg-blue-100 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            required
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-gray-700 mb-2 block">Address *</Label>
                          <Input
                            value={signupData.address}
                            onChange={(e) => setSignupData({ ...signupData, address: e.target.value })}
                            className="h-14 bg-blue-50 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:bg-blue-100 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-semibold text-gray-700 mb-2 block">City *</Label>
                            <Input
                              value={signupData.city}
                              onChange={(e) => setSignupData({ ...signupData, city: e.target.value })}
                              className="h-14 bg-blue-50 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:bg-blue-100 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Province *</Label>
                            <Input
                              value={signupData.province}
                              onChange={(e) => setSignupData({ ...signupData, province: e.target.value })}
                              className="h-14 bg-blue-50 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:bg-blue-100 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-gray-700 mb-2 block">School Type *</Label>
                          <Select
                            value={signupData.schoolType}
                            onValueChange={(value) => setSignupData({ ...signupData, schoolType: value })}
                          >
                            <SelectTrigger className="h-14 bg-blue-50 border-2 border-blue-200 rounded-xl focus:border-blue-500 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="government">Government</SelectItem>
                              <SelectItem value="private">Private</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="border-t pt-4 space-y-4">
                        <h3 className="font-semibold text-gray-800">Registration Certificate</h3>
                        <div>
                          <Label className="text-sm font-semibold text-gray-700 mb-2 block">Certificate Type *</Label>
                          <Select
                            value={certificateType}
                            onValueChange={(value) => {
                              setCertificateType(value as "upload" | "number");
                              setSelectedFile(null);
                              setSignupData({ ...signupData, certificateNumber: "" });
                            }}
                          >
                            <SelectTrigger className="h-14 bg-blue-50 border-2 border-blue-200 rounded-xl focus:border-blue-500 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="number">Registration Number</SelectItem>
                              <SelectItem value="upload">Upload Certificate</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {certificateType === "number" ? (
                          <div>
                            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Certificate Number *</Label>
                            <Input
                              value={signupData.certificateNumber}
                              onChange={(e) => setSignupData({ ...signupData, certificateNumber: e.target.value })}
                              className="h-14 bg-blue-50 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:bg-blue-100 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                              required
                            />
                          </div>
                        ) : (
                          <div>
                            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Upload Certificate *</Label>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-400 transition-colors">
                              <input
                                type="file"
                                id="certificateFile"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileChange}
                                className="hidden"
                                required
                              />
                              <label htmlFor="certificateFile" className="cursor-pointer flex flex-col items-center gap-2">
                                <Upload className="h-6 w-6 text-gray-400" />
                                <span className="text-sm text-gray-600">Click to upload (PDF, JPG, PNG - max 5MB)</span>
                              </label>
                              {selectedFile && (
                                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                                  <span className="text-sm text-green-700">{selectedFile.name}</span>
                                  <button type="button" onClick={() => setSelectedFile(null)} className="hover:bg-red-50 p-1 rounded">
                                    <X className="h-4 w-4 text-red-600" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !selectedRole || (selectedRole === "admin" && (domainAvailable === false || checkingDomain))}
              className="w-full mt-6 h-14 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-5 w-5" />
                  Sign Up Now
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Right Side Panel - Sign Up Promotion */}
        <div className={`absolute right-0 top-0 w-1/2 h-full transition-transform duration-700 ease-in-out ${isSignUp ? 'translate-x-full' : 'translate-x-0'}`}>
          <div className="relative w-full h-full bg-gradient-to-br from-purple-600 via-indigo-700 to-purple-800 flex flex-col items-center justify-center p-12 text-white">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">New here?</h1>
              <p className="text-lg mb-8 opacity-90">Sign up and discover</p>
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="border-2 border-white rounded-full px-8 py-3 font-semibold hover:bg-white/20 transition-all duration-300"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>

        {/* Left Side Panel - Sign In Promotion (shown when signup is active) */}
        <div className={`absolute left-0 top-0 w-1/2 h-full transition-transform duration-700 ease-in-out ${isSignUp ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="relative w-full h-full bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex flex-col items-center justify-center p-12 text-white">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">One of us?</h1>
              <p className="text-lg mb-8 opacity-90">Just sign in</p>
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="border-2 border-white rounded-full px-8 py-3 font-semibold hover:bg-white/20 transition-all duration-300"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
