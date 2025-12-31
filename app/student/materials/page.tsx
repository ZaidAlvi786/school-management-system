"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import { Download, FileText, File, Image, Video, User, Calendar, BookOpen, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Material {
  id: string;
  title: string;
  description?: string;
  file_url?: string;
  file_type?: string;
  subject: {
    name: string;
    code?: string;
  };
  uploaded_by: {
    name: string;
  };
  created_at: string;
  class: {
    name: string;
  };
}

export default function StudentMaterialsPage() {
  const { data: session, status } = useSession();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
    if (status === "authenticated" && session?.user?.role !== "student") {
      redirect("/");
    }
  }, [status, session]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchMaterials();
    }
  }, [status]);

  const fetchMaterials = async () => {
    try {
      const response = await fetch("/api/student/materials");
      if (response.ok) {
        const data = await response.json();
        setMaterials(data);
      }
    } catch (error) {
      console.error("Failed to fetch materials:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <FileText className="h-5 w-5" />;
    const type = fileType.toLowerCase();
    if (type.includes("image")) return <Image className="h-5 w-5" />;
    if (type.includes("video")) return <Video className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const getFileColor = (fileType?: string) => {
    if (!fileType) return "from-blue-500 to-cyan-500";
    const type = fileType.toLowerCase();
    if (type.includes("image")) return "from-pink-500 to-rose-500";
    if (type.includes("video")) return "from-purple-500 to-violet-500";
    return "from-blue-500 to-cyan-500";
  };

  // Group by subject
  const groupedMaterials = materials.reduce((acc: any, material: Material) => {
    const subjectName = material.subject?.name || "Unknown";
    if (!acc[subjectName]) {
      acc[subjectName] = [];
    }
    acc[subjectName].push(material);
    return acc;
  }, {});

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-0 md:ml-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Header with animated gradient background */}
          <div className="mb-6 md:mb-8 animate-slide-up relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-600/10 via-cyan-600/10 to-blue-600/10 rounded-3xl blur-3xl"></div>
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
              <div className="p-3 md:p-4 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl shadow-lg transform hover:scale-110 transition-transform duration-300">
                <Download className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-teal-900 to-cyan-900 bg-clip-text text-transparent">
                  Study Materials
                </h1>
                <p className="text-gray-600 mt-1 text-sm md:text-base">Access your learning resources and downloads</p>
              </div>
              <div className="hidden sm:block">
                <div className="p-3 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-xl">
                  <Sparkles className="h-6 w-6 text-teal-600 animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {Object.keys(groupedMaterials).length > 0 ? (
            <div className="grid gap-6 md:gap-8">
              {Object.entries(groupedMaterials).map(([subjectName, items]: [string, any], index) => (
                <Card
                  key={subjectName}
                  className="border-2 hover:shadow-2xl transition-all duration-500 animate-slide-up hover:scale-[1.01] overflow-hidden group relative"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <CardHeader className="relative z-10">
                    <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-teal-500 to-cyan-500 opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-300"></div>
                    
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl md:text-2xl font-bold text-gray-900 group-hover:text-teal-600 transition-colors">
                          {subjectName}
                        </CardTitle>
                        <CardDescription className="text-sm md:text-base mt-1">
                          {items.length} {items.length === 1 ? "material" : "materials"} available
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="relative z-10">
                    <div className="grid gap-3 md:gap-4">
                      {items.map((material: Material, itemIndex: number) => (
                        <div
                          key={material.id}
                          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 md:p-5 rounded-xl border-2 hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition-all duration-300 group/item hover:shadow-md"
                          style={{ animationDelay: `${itemIndex * 0.03}s` }}
                        >
                          <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                            <div className={`p-3 bg-gradient-to-br ${getFileColor(material.file_type)} rounded-xl text-white shadow-lg group-hover/item:scale-110 group-hover/item:rotate-3 transition-transform duration-300 flex-shrink-0`}>
                              {getFileIcon(material.file_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm md:text-base text-gray-900 mb-2 group-hover/item:text-teal-600 transition-colors truncate">
                                {material.title}
                              </h4>
                              {material.description && (
                                <p className="text-xs md:text-sm text-gray-600 mb-3 line-clamp-2">{material.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-600">
                                <span className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-lg border border-gray-100">
                                  <User className="h-3 w-3 md:h-4 md:w-4 text-teal-500" />
                                  {material.uploaded_by?.name || "Unknown"}
                                </span>
                                <span className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-lg border border-gray-100">
                                  <Calendar className="h-3 w-3 md:h-4 md:w-4 text-teal-500" />
                                  {new Date(material.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          {material.file_url && (
                            <div className="flex-shrink-0">
                              <Button
                                className="w-full md:w-auto bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 group-hover/item:scale-105"
                                onClick={() => window.open(material.file_url, '_blank')}
                              >
                                <Download className="h-4 w-4 mr-2 group-hover/item:animate-bounce" />
                                Download
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-2 animate-slide-up hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <CardContent className="py-12 md:py-16 text-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 to-cyan-50/50"></div>
                <div className="relative z-10">
                  <div className="p-4 md:p-6 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 flex items-center justify-center shadow-lg animate-pulse">
                    <Download className="h-10 w-10 md:h-12 md:w-12 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">No Materials Available</h3>
                  <p className="text-gray-600 text-sm md:text-base">Study materials will appear here once they are uploaded</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
