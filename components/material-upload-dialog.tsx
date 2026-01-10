"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, FileText, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ClassSubject {
    class_id: string;
    class_name: string;
    subject_id: string;
    subject_name: string;
    subject_code: string;
}

interface MaterialUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function MaterialUploadDialog({
    open,
    onOpenChange,
    onSuccess,
}: MaterialUploadDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [classesSubjects, setClassesSubjects] = useState<ClassSubject[]>([]);
    const [selectedClassSubject, setSelectedClassSubject] = useState<string>("");
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (open) {
            fetchClassesSubjects();
        } else {
            // Reset form on close
            setFile(null);
            setTitle("");
            setDescription("");
            setSelectedClassSubject("");
        }
    }, [open]);

    const fetchClassesSubjects = async () => {
        try {
            const { getClassesSubjects } = await import("@/lib/fastapi-client");
            const data = await getClassesSubjects();
            // Transform the API response to the expected flat structure
            const flatArray: ClassSubject[] = [];
            
            if (data.classes && Array.isArray(data.classes)) {
                data.classes.forEach((cls: any) => {
                    if (cls.subjects && Array.isArray(cls.subjects)) {
                        cls.subjects.forEach((subject: any) => {
                            flatArray.push({
                                class_id: cls._id || cls.id || "",
                                class_name: cls.name || "",
                                subject_id: subject._id || subject.id || "",
                                subject_name: subject.name || "",
                                subject_code: subject.code || "",
                            });
                        });
                    }
                });
            }
            
            setClassesSubjects(flatArray);
        } catch (error) {
            console.error("Failed to fetch classes:", error);
            setClassesSubjects([]); // Ensure it's always an array
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !selectedClassSubject || !title) return;

        try {
            setLoading(true);

            // Simulating file upload to storage (In a real app, upload to Supabase Storage here)
            // For this demo, we'll assume a public URL or base64 (not recommended for large files)
            // Since we don't have the storage bucket setup fully described and auth token for it, 
            // we will simulate the "url" by just using the filename for now or a placeholder.
            // Ideally: 
            // 1. Upload to Supabase Storage using supabase-js
            // 2. Get public URL
            // 3. Save to DB

            // MOCK UPLOAD: In a real scenario, implement actual file upload here.
            // We'll proceed with creating the DB record assuming the file "uploaded"
            const mockFileUrl = `https://example.com/materials/${file.name}`;

            // Parse selected value "classId|subjectId"
            const [classId, subjectId] = selectedClassSubject.split("|");

            const { createMaterial } = await import("@/lib/fastapi-client");
            const payload = new FormData();
            payload.append("title", title);
            payload.append("description", description);
            payload.append("class_id", classId);
            payload.append("subject_id", subjectId);
            // For now, attach the file directly; backend should save and return URL
            payload.append("file", file);
            await createMaterial(payload);

            toast({
                title: "Success",
                description: "Material uploaded successfully!",
                className: "bg-green-500 text-white",
            });

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Upload error:", error);
            toast({
                title: "Error",
                description: "Failed to upload material",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Upload Teaching Material</DialogTitle>
                    <DialogDescription>
                        Share resources with your students.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            placeholder="e.g. Chapter 1 Notes"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="class">Class & Subject</Label>
                        <Select value={selectedClassSubject} onValueChange={setSelectedClassSubject} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Class & Subject" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.isArray(classesSubjects) && classesSubjects.length > 0 ? (
                                    classesSubjects.map((item) => (
                                        <SelectItem key={`${item.class_id}|${item.subject_id}`} value={`${item.class_id}|${item.subject_id}`}>
                                            {item.class_name} - {item.subject_name} ({item.subject_code})
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="no-options" disabled>No classes/subjects available</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            placeholder="Brief description of the material..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="file">File</Label>
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                            <input
                                type="file"
                                id="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                                required
                            />
                            <div className="flex flex-col items-center gap-2">
                                {file ? (
                                    <>
                                        <FileText className="h-8 w-8 text-blue-500" />
                                        <span className="text-sm font-medium text-gray-700">{file.name}</span>
                                        <span className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-8 w-8 text-gray-400" />
                                        <span className="text-sm text-gray-600">Click to browse or drag file here</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !file || !title || !selectedClassSubject} className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                "Upload Material"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
