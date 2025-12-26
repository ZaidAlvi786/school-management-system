"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Building2, Check, X, Upload, FileText, Loader2, Mail, Lock, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AdminSignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainAvailable, setDomainAvailable] = useState<boolean | null>(null);
  const [certificateType, setCertificateType] = useState<"upload" | "number">("number");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: "",
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

  // Check domain availability
  const checkDomain = async (domain: string) => {
    if (!domain || domain.length < 3) {
      setDomainAvailable(null);
      return;
    }

    setCheckingDomain(true);
    try {
      const res = await fetch(`/api/auth/check-domain?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      
      if (res.ok) {
        setDomainAvailable(data.available);
        if (!data.available) {
          toast({
            title: "Domain Unavailable",
            description: data.message || "This domain is already taken",
            variant: "destructive",
          });
        }
      } else {
        setDomainAvailable(false);
        toast({
          title: "Error",
          description: data.error || "Failed to check domain",
          variant: "destructive",
        });
      }
    } catch (error) {
      setDomainAvailable(false);
      toast({
        title: "Error",
        description: "Failed to check domain availability",
        variant: "destructive",
      });
    } finally {
      setCheckingDomain(false);
    }
  };

  // Debounced domain check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.domain) {
        checkDomain(formData.domain);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.domain]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF or image file (JPEG, PNG)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (domainAvailable === false) {
      toast({
        title: "Domain Unavailable",
        description: "Please choose a different domain",
        variant: "destructive",
      });
      return;
    }

    if (certificateType === "upload" && !selectedFile) {
      toast({
        title: "Certificate Required",
        description: "Please upload a certificate file",
        variant: "destructive",
      });
      return;
    }

    if (certificateType === "number" && !formData.certificateNumber) {
      toast({
        title: "Certificate Number Required",
        description: "Please enter certificate registration number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const submitFormData = new FormData();
      submitFormData.append("name", formData.name);
      submitFormData.append("userName", formData.userName);
      submitFormData.append("domain", formData.domain);
      submitFormData.append("password", formData.password);
      submitFormData.append("phone", formData.phone);
      submitFormData.append("schoolName", formData.schoolName);
      submitFormData.append("schoolCode", formData.schoolCode);
      submitFormData.append("address", formData.address);
      submitFormData.append("city", formData.city);
      submitFormData.append("province", formData.province);
      submitFormData.append("schoolType", formData.schoolType);
      submitFormData.append("certificateType", certificateType);
      submitFormData.append("certificateNumber", formData.certificateNumber);
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
        router.push("/login");
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

  const generatedEmail = formData.userName && formData.domain 
    ? `${formData.userName.toLowerCase()}@${formData.domain.toLowerCase()}`
    : "";

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-700 to-blue-800 animate-gradient py-12 px-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: "2s" }}></div>
        <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: "4s" }}></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-20 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        <Card className="backdrop-blur-xl bg-white/95 shadow-2xl border-0 animate-slide-up">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-indigo-600 to-blue-600 rounded-3xl blur-2xl opacity-50 animate-pulse-glow"></div>
                <div className="relative p-5 bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 rounded-3xl transform hover:scale-110 transition-transform duration-300 animate-bounce-in">
                  <Building2 className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                Admin Registration
              </CardTitle>
              <CardDescription className="text-base">
                Create your school management account. Your registration will be reviewed for approval.
              </CardDescription>
            </div>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Domain & Email */}
            <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Domain & Email</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userName">Username</Label>
                  <Input
                    id="userName"
                    value={formData.userName}
                    onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                    placeholder="admin"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain Name</Label>
                  <div className="relative group">
                    <Input
                      id="domain"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value.toLowerCase() })}
                      placeholder="school.com"
                      className="pl-10 pr-10 transition-all duration-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                    {checkingDomain && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-purple-500" />
                    )}
                    {!checkingDomain && formData.domain && domainAvailable !== null && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 animate-bounce-in">
                        {domainAvailable ? (
                          <div className="p-1 bg-green-100 rounded-full">
                            <Check className="h-4 w-4 text-green-600" />
                          </div>
                        ) : (
                          <div className="p-1 bg-red-100 rounded-full">
                            <X className="h-4 w-4 text-red-600" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {formData.domain && domainAvailable !== null && (
                    <p className={`text-xs font-medium animate-fade-in ${domainAvailable ? "text-green-600" : "text-red-600"}`}>
                      {domainAvailable ? "✓ Domain is available" : "✗ Domain is already taken"}
                    </p>
                  )}
                </div>
              </div>
              {generatedEmail && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-md animate-fade-in transform hover:scale-[1.02] transition-transform">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-semibold text-gray-700">Your email will be:</p>
                  </div>
                  <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                    {generatedEmail}
                  </p>
                </div>
              )}
            </div>

            {/* Password */}
            <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                  <Lock className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Password</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
              </div>
            </div>

            {/* School Information */}
            <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <div className="p-2 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">School Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name</Label>
                  <Input
                    id="schoolName"
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolCode">School Code</Label>
                  <Input
                    id="schoolCode"
                    value={formData.schoolCode}
                    onChange={(e) => setFormData({ ...formData, schoolCode: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <Input
                    id="province"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolType">School Type</Label>
                  <Select
                    value={formData.schoolType}
                    onValueChange={(value) => setFormData({ ...formData, schoolType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="government">Government</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Certificate */}
            <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <div className="p-2 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-lg">
                  <FileText className="h-5 w-5 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Registration Certificate</h3>
              </div>
              <div className="space-y-2">
                <Label>Certificate Type</Label>
                <Select
                  value={certificateType}
                  onValueChange={(value) => {
                    setCertificateType(value as "upload" | "number");
                    setSelectedFile(null);
                    setFormData({ ...formData, certificateNumber: "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Certificate Registration Number
                      </div>
                    </SelectItem>
                    <SelectItem value="upload">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Upload Certificate
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {certificateType === "number" ? (
                <div className="space-y-2">
                  <Label htmlFor="certificateNumber">Certificate Registration Number</Label>
                  <Input
                    id="certificateNumber"
                    value={formData.certificateNumber}
                    onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })}
                    placeholder="Enter registration number"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="certificateFile">Upload Certificate</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 hover:bg-purple-50/50 transition-all duration-300 group cursor-pointer">
                    <input
                      type="file"
                      id="certificateFile"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                      required={certificateType === "upload"}
                    />
                    <label
                      htmlFor="certificateFile"
                      className="cursor-pointer flex flex-col items-center gap-3"
                    >
                      <div className="p-4 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full group-hover:scale-110 transition-transform duration-300">
                        <Upload className="h-8 w-8 text-purple-600 group-hover:text-purple-700" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-purple-600 group-hover:text-purple-700 transition-colors">
                          Click to upload certificate
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          PDF, JPG, or PNG (max 5MB)
                        </p>
                      </div>
                    </label>
                    {selectedFile && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl shadow-md animate-bounce-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <FileText className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-green-900 block">
                                {selectedFile.name}
                              </span>
                              <span className="text-xs text-green-600">
                                {(selectedFile.size / 1024).toFixed(2)} KB
                              </span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFile(null)}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:gap-3 transition-all duration-300 group"
              >
                <ArrowRight className="h-4 w-4 group-hover:-translate-x-1 transition-transform rotate-180" />
                Already have an account? Login
              </Link>
              <Button
                type="submit"
                disabled={loading || checkingDomain || domainAvailable === false}
                className="bg-gradient-to-r from-purple-500 via-indigo-600 to-blue-600 hover:from-purple-600 hover:via-indigo-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 h-12 px-8 font-semibold group"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                    Create Account
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

