"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/sidebar";
import { Upload, FileText, Download, Trash2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import MaterialUploadDialog from "@/components/material-upload-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Material {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  created_at: string;
  classes: { name: string; level: number };
  subjects: { name: string; code: string };
}

export default function TeacherMaterialsPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");

  useEffect(() => {
    if (status === "authenticated") {
      fetchMaterials();
    }
  }, [status]);

  if (status === "unauthenticated") {
    redirect("/login");
  }
  if (status === "authenticated" && session?.user?.role !== "teacher") {
    redirect("/");
  }

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { getTeacherMaterials } = await import("@/lib/fastapi-client");
      const data = await getTeacherMaterials();
      setMaterials(data);
    } catch (error: any) {
      console.error("Failed to fetch materials:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch materials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { deleteMaterial } = await import("@/lib/fastapi-client");
      await deleteMaterial(id);
      
      toast({
        title: "Deleted",
        description: "Material deleted successfully",
      });
      fetchMaterials();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete material",
        variant: "destructive",
      });
    }
  };

  const filteredMaterials = materials.filter(m =>
    (m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.classes.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.subjects.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterSubject === "all" || m.subjects.name === filterSubject)
  );

  const uniqueSubjects = Array.from(new Set(materials.map(m => m.subjects.name)));

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8 animate-slide-up">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-md">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Teaching Materials
              </h1>
            </div>
            <p className="text-sm sm:text-base text-gray-600">Upload and manage teaching resources for your students</p>
          </div>

          {/* Actions Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-center bg-white/50 p-4 rounded-xl border border-white/40 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search materials..."
                className="pl-9 bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-full sm:w-48 bg-white/80 border-gray-200">
                <SelectValue placeholder="Filter by Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {uniqueSubjects.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => setShowUploadDialog(true)}
            className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload New Material
          </Button>
        </div>

          {/* Materials Grid */}
          {filteredMaterials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map((material) => (
              <Card key={material.id} className="group hover:shadow-xl transition-all duration-300 border-white/50 bg-white/80 backdrop-blur-sm overflow-hidden hover:-translate-y-1">
                <CardHeader className="pb-3 relative">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Material?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete &quot;{material.title}&quot;.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(material.id)} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="flex justify-between items-start pr-8">
                    <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <Badge variant="outline" className="bg-white/50 ml-2">
                      {material.classes.name}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-lg line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {material.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">
                    {material.subjects.name} • {new Date(material.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10">
                    {material.description || "No description provided."}
                  </p>
                  <Button
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200"
                    onClick={() => window.open(material.file_url, "_blank")}
                  >
                    <Download className="h-4 w-4 mr-2 text-slate-500" />
                    Download File
                  </Button>
                </CardContent>
              </Card>
            ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white/50 rounded-2xl border border-dashed border-gray-300">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No materials found</h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Upload your first teaching material to share with your students.
            </p>
            <Button
              onClick={() => setShowUploadDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Material
            </Button>
            </div>
          )}

        </div>
      </main>

      <MaterialUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onSuccess={() => {
          fetchMaterials();
        }}
      />
    </div>
  );
}
