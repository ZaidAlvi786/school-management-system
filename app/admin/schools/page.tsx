"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, Edit, Building2, Search, Check, X } from "lucide-react";

interface School {
  _id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  province: string;
  type: string;
  campuses: Campus[];
  principal?: {
    user?: {
      name: string;
      email: string;
    };
  };
}

interface Campus {
  _id: string;
  name: string;
  address: string;
  school: string;
  principal?: {
    user?: {
      name: string;
      email: string;
    };
  };
}

export default function SchoolsPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSchoolDialog, setShowSchoolDialog] = useState(false);
  const [showCampusDialog, setShowCampusDialog] = useState(false);
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    province: "",
    type: "government",
    principalEmail: "",
  });
  const [campusData, setCampusData] = useState({
    name: "",
    address: "",
    principalEmail: "",
  });
  const [campusPrincipalSearchResults, setCampusPrincipalSearchResults] = useState<Array<{
    _id: string;
    email: string;
    name: string;
    role: string;
    phone?: string;
  }>>([]);
  const [showCampusPrincipalSuggestions, setShowCampusPrincipalSuggestions] = useState(false);
  const [campusPrincipalSearchLoading, setCampusPrincipalSearchLoading] = useState(false);
  const [selectedCampusPrincipal, setSelectedCampusPrincipal] = useState<{
    email: string;
    name: string;
  } | null>(null);
  const [principalSearchResults, setPrincipalSearchResults] = useState<Array<{
    _id: string;
    email: string;
    name: string;
    role: string;
    phone?: string;
  }>>([]);
  const [showPrincipalSuggestions, setShowPrincipalSuggestions] = useState(false);
  const [principalSearchLoading, setPrincipalSearchLoading] = useState(false);
  const [selectedPrincipal, setSelectedPrincipal] = useState<{
    email: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
    if (status === "authenticated" && session?.user?.role !== "admin" && session?.user?.role !== "principal") {
      redirect("/");
    }
  }, [status, session]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchSchools();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Debounced search for principal email (for school creation)
  useEffect(() => {
    const searchPrincipal = async () => {
      if (formData.principalEmail.length < 2) {
        setPrincipalSearchResults([]);
        setShowPrincipalSuggestions(false);
        setSelectedPrincipal(null);
        return;
      }

      setPrincipalSearchLoading(true);
      try {
        const res = await fetch(
          `/api/admin/users/search?email=${encodeURIComponent(formData.principalEmail)}&role=principal`
        );
        if (res.ok) {
          const data = await res.json();
          setPrincipalSearchResults(data.users || []);
          setShowPrincipalSuggestions(data.users && data.users.length > 0);
        }
      } catch (error) {
        console.error("Error searching principals:", error);
      } finally {
        setPrincipalSearchLoading(false);
      }
    };

    const timeoutId = setTimeout(searchPrincipal, 300);
    return () => clearTimeout(timeoutId);
  }, [formData.principalEmail]);

  // Debounced search for principal email (for campus creation)
  useEffect(() => {
    const searchCampusPrincipal = async () => {
      if (campusData.principalEmail.length < 2) {
        setCampusPrincipalSearchResults([]);
        setShowCampusPrincipalSuggestions(false);
        setSelectedCampusPrincipal(null);
        return;
      }

      setCampusPrincipalSearchLoading(true);
      try {
        const res = await fetch(
          `/api/admin/users/search?email=${encodeURIComponent(campusData.principalEmail)}&role=principal`
        );
        if (res.ok) {
          const data = await res.json();
          setCampusPrincipalSearchResults(data.users || []);
          setShowCampusPrincipalSuggestions(data.users && data.users.length > 0);
        }
      } catch (error) {
        console.error("Error searching principals:", error);
      } finally {
        setCampusPrincipalSearchLoading(false);
      }
    };

    const timeoutId = setTimeout(searchCampusPrincipal, 300);
    return () => clearTimeout(timeoutId);
  }, [campusData.principalEmail]);

  const fetchSchools = async () => {
    try {
      const res = await fetch("/api/admin/schools");
      if (res.ok) {
        const data = await res.json();
        setSchools(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch schools",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          campuses: [],
        }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "School created successfully",
        });
        setShowSchoolDialog(false);
        setFormData({
          name: "",
          code: "",
          address: "",
          city: "",
          province: "",
          type: "government",
          principalEmail: "",
        });
        fetchSchools();
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create school",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create school",
        variant: "destructive",
      });
    }
  };

  const handleCreateCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;

    if (!editingCampus && !campusData.principalEmail) {
      toast({
        title: "Error",
        description: "Please select a principal for this campus",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = editingCampus ? "/api/admin/campuses" : "/api/admin/campuses";
      const method = editingCampus ? "PUT" : "POST";
      const body = editingCampus
        ? {
            id: editingCampus._id,
            name: campusData.name,
            address: campusData.address,
          }
        : {
            name: campusData.name,
            address: campusData.address,
            schoolId: selectedSchool,
            principalEmail: campusData.principalEmail,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: editingCampus ? "Campus updated successfully" : "Campus created successfully",
        });
        setShowCampusDialog(false);
        setEditingCampus(null);
        setCampusData({ name: "", address: "", principalEmail: "" });
        setSelectedCampusPrincipal(null);
        setSelectedSchool(null);
        fetchSchools();
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || (editingCampus ? "Failed to update campus" : "Failed to create campus"),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: editingCampus ? "Failed to update campus" : "Failed to create campus",
        variant: "destructive",
      });
    }
  };

  const handleEditCampus = (campus: Campus, schoolId: string) => {
    setEditingCampus(campus);
    setSelectedSchool(schoolId);
    setCampusData({
      name: campus.name,
      address: campus.address,
      principalEmail: campus.principal?.user?.email || "",
    });
    if (campus.principal?.user) {
      setSelectedCampusPrincipal({
        email: campus.principal.user.email,
        name: campus.principal.user.name,
      });
    }
    setShowCampusDialog(true);
  };

  const handleDeleteCampus = async (campusId: string) => {
    if (!confirm("Are you sure you want to delete this campus?")) return;

    try {
      const res = await fetch(`/api/admin/campuses?id=${campusId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Campus deleted successfully",
        });
        fetchSchools();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete campus",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete campus",
        variant: "destructive",
      });
    }
  };

  if (status === "loading" || loading) {
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Campus Management</h2>
            <p className="text-gray-600">Manage campuses for your school</p>
          </div>
          {session?.user?.role === "principal" && (
            <Dialog open={showSchoolDialog} onOpenChange={setShowSchoolDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Add School
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New School</DialogTitle>
                <DialogDescription>Add a new school to the system</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSchool} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">School Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">School Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
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
                <div className="grid grid-cols-2 gap-4">
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">School Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
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
                <div className="space-y-2">
                  <Label htmlFor="principalEmail">Principal Email</Label>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="principalEmail"
                        type="email"
                        value={formData.principalEmail}
                        onChange={(e) => {
                          setFormData({ ...formData, principalEmail: e.target.value });
                          setSelectedPrincipal(null);
                          setShowPrincipalSuggestions(true);
                        }}
                        onFocus={() => {
                          if (principalSearchResults.length > 0) {
                            setShowPrincipalSuggestions(true);
                          }
                        }}
                        onBlur={() => {
                          // Delay to allow click on suggestion
                          setTimeout(() => setShowPrincipalSuggestions(false), 200);
                        }}
                        placeholder="Search principal by email..."
                        className="pl-10 pr-10"
                        required
                      />
                      {formData.principalEmail && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, principalEmail: "" });
                            setSelectedPrincipal(null);
                            setPrincipalSearchResults([]);
                            setShowPrincipalSuggestions(false);
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {showPrincipalSuggestions && principalSearchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {principalSearchLoading ? (
                          <div className="p-3 text-sm text-gray-500 text-center">Searching...</div>
                        ) : (
                          principalSearchResults.map((user) => (
                            <div
                              key={user._id}
                              onClick={() => {
                                setFormData({ ...formData, principalEmail: user.email });
                                setSelectedPrincipal({ email: user.email, name: user.name });
                                setShowPrincipalSuggestions(false);
                              }}
                              className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                  <p className="text-xs text-gray-600">{user.email}</p>
                                  {user.phone && (
                                    <p className="text-xs text-gray-500 mt-1">📞 {user.phone}</p>
                                  )}
                                </div>
                                {selectedPrincipal?.email === user.email && (
                                  <Check className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    {formData.principalEmail.length >= 2 && !principalSearchLoading && principalSearchResults.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                        <p className="text-sm text-gray-500 text-center">
                          No principal found with this email. Make sure the user exists and has the &quot;principal&quot; role.
                        </p>
                      </div>
                    )}
                    {selectedPrincipal && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-green-900">
                              Selected: {selectedPrincipal.name}
                            </p>
                            <p className="text-xs text-green-700">{selectedPrincipal.email}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowSchoolDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create School</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>

        <div className="grid gap-6">
          {schools.map((school) => (
            <Card key={school._id} className="overflow-hidden border-2 hover:border-blue-300 transition-all duration-300 hover:shadow-xl">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6">
                <CardHeader className="p-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-3 text-white mb-2">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                          <Building2 className="h-6 w-6" />
                        </div>
                        <span className="text-2xl">{school.name}</span>
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                          {school.code}
                        </span>
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium capitalize">
                          {school.type}
                        </span>
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm">
                          📍 {school.city}, {school.province}
                        </span>
                      </div>
                      {school.principal?.user && (
                        <div className="mt-3 flex items-center gap-2 text-white/90">
                          <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-sm font-semibold">
                            {school.principal.user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{school.principal.user.name}</p>
                            <p className="text-xs text-white/70">{school.principal.user.email}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <Dialog open={showCampusDialog && selectedSchool === school._id} onOpenChange={(open) => {
                      setShowCampusDialog(open);
                      if (open) setSelectedSchool(school._id);
                      else setSelectedSchool(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-white text-blue-600 hover:bg-white/90 shadow-lg">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Campus
                        </Button>
                      </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingCampus ? "Edit Campus" : "Add Campus"}</DialogTitle>
                        <DialogDescription>
                          {editingCampus ? "Update campus information" : `Add a new campus to ${school.name}`}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateCampus} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="campusName">Campus Name</Label>
                          <Input
                            id="campusName"
                            value={campusData.name}
                            onChange={(e) => setCampusData({ ...campusData, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="campusAddress">Address</Label>
                          <Input
                            id="campusAddress"
                            value={campusData.address}
                            onChange={(e) => setCampusData({ ...campusData, address: e.target.value })}
                            placeholder={school.address}
                          />
                        </div>
                        {!editingCampus && (
                          <div className="space-y-2">
                            <Label htmlFor="campusPrincipalEmail">Principal Email *</Label>
                          <div className="relative">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                id="campusPrincipalEmail"
                                type="email"
                                value={campusData.principalEmail}
                                onChange={(e) => {
                                  setCampusData({ ...campusData, principalEmail: e.target.value });
                                  setSelectedCampusPrincipal(null);
                                  setShowCampusPrincipalSuggestions(true);
                                }}
                                onFocus={() => {
                                  if (campusPrincipalSearchResults.length > 0) {
                                    setShowCampusPrincipalSuggestions(true);
                                  }
                                }}
                                onBlur={() => {
                                  setTimeout(() => setShowCampusPrincipalSuggestions(false), 200);
                                }}
                                placeholder="Search principal by email..."
                                className="pl-10 pr-10"
                                required
                              />
                              {campusData.principalEmail && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCampusData({ ...campusData, principalEmail: "" });
                                    setSelectedCampusPrincipal(null);
                                    setCampusPrincipalSearchResults([]);
                                    setShowCampusPrincipalSuggestions(false);
                                  }}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            {showCampusPrincipalSuggestions && campusPrincipalSearchResults.length > 0 && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                                {campusPrincipalSearchLoading ? (
                                  <div className="p-3 text-sm text-gray-500 text-center">Searching...</div>
                                ) : (
                                  campusPrincipalSearchResults.map((user) => (
                                    <div
                                      key={user._id}
                                      onClick={() => {
                                        setCampusData({ ...campusData, principalEmail: user.email });
                                        setSelectedCampusPrincipal({ email: user.email, name: user.name });
                                        setShowCampusPrincipalSuggestions(false);
                                      }}
                                      className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                          <p className="text-xs text-gray-600">{user.email}</p>
                                          {user.phone && (
                                            <p className="text-xs text-gray-500 mt-1">📞 {user.phone}</p>
                                          )}
                                        </div>
                                        {selectedCampusPrincipal?.email === user.email && (
                                          <Check className="h-4 w-4 text-green-500" />
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                            {campusData.principalEmail.length >= 2 && !campusPrincipalSearchLoading && campusPrincipalSearchResults.length === 0 && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                                <p className="text-sm text-gray-500 text-center">
                                  No principal found. An invite will be sent if the email doesn&apos;t have an account.
                                </p>
                              </div>
                            )}
                            {selectedCampusPrincipal && (
                              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Check className="h-4 w-4 text-green-600" />
                                  <div>
                                    <p className="text-sm font-medium text-green-900">
                                      Selected: {selectedCampusPrincipal.name}
                                    </p>
                                    <p className="text-xs text-green-700">{selectedCampusPrincipal.email}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          </div>
                        )}
                        {editingCampus && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-900">
                              <strong>Principal:</strong> {editingCampus.principal?.user?.name || "Not assigned"} ({editingCampus.principal?.user?.email || "N/A"})
                            </p>
                            <p className="text-xs text-blue-700 mt-1">Principal cannot be changed after campus creation</p>
                          </div>
                        )}
                        <DialogFooter>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setShowCampusDialog(false);
                              setEditingCampus(null);
                              setSelectedSchool(null);
                              setCampusData({ name: "", address: "", principalEmail: "" });
                              setSelectedCampusPrincipal(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button type="submit">{editingCampus ? "Update Campus" : "Create Campus"}</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              </div>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-500" />
                      Campuses ({school.campuses?.length || 0})
                    </h4>
                  </div>
                  {school.campuses && school.campuses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {school.campuses.map((campus) => (
                        <div
                          key={campus._id}
                          className="group flex justify-between items-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-100 hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 mb-1">{campus.name}</p>
                            <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                              <span>📍</span>
                              {campus.address || school.address}
                            </p>
                            {campus.principal?.user && (
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <div className="h-6 w-6 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-semibold">
                                  {campus.principal.user.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{campus.principal.user.name}</p>
                                  <p className="text-gray-600">{campus.principal.user.email}</p>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditCampus(campus, school._id)}
                              className="hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCampus(campus._id)}
                              className="hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No campuses yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {schools.length === 0 && (
          <Card className="border-2 border-dashed">
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center">
                <div className="p-4 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full mb-4">
                  <Building2 className="h-12 w-12 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {session?.user?.role === "admin" ? "No School Found" : "No Schools Yet"}
                </h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  {session?.user?.role === "admin"
                    ? "Your school should have been created during signup. Please contact support if you don't see your school."
                    : "Get started by creating your first school. You can add multiple campuses and manage them all from here."}
                </p>
                {session?.user?.role === "principal" && (
                  <Button
                    onClick={() => setShowSchoolDialog(true)}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First School
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
