"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import LogoutButton from "@/components/logout-button";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, Edit, UserCheck, Search, Check, X, Building2 } from "lucide-react";

interface Principal {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  employeeId: string;
  qualification: string;
  experience: number;
  school?: {
    _id: string;
    name: string;
  };
  campus?: {
    _id: string;
    name: string;
  };
}

export default function PrincipalsPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrincipalDialog, setShowPrincipalDialog] = useState(false);
  const [editingPrincipal, setEditingPrincipal] = useState<Principal | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    qualification: "",
    experience: 0,
  });
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
    if (status === "authenticated" && session?.user?.role !== "admin") {
      redirect("/");
    }
  }, [status, session]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchPrincipals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Debounced search for principal email
  useEffect(() => {
    const searchPrincipal = async () => {
      if (formData.email.length < 2) {
        setPrincipalSearchResults([]);
        setShowPrincipalSuggestions(false);
        setSelectedPrincipal(null);
        return;
      }

      setPrincipalSearchLoading(true);
      try {
        const { searchUsers } = await import("@/lib/fastapi-client");
        const data = await searchUsers(formData.email, "principal");
        setPrincipalSearchResults(data.users || []);
        setShowPrincipalSuggestions(data.users && data.users.length > 0);
      } catch (error) {
        console.error("Error searching principals:", error);
      } finally {
        setPrincipalSearchLoading(false);
      }
    };

    const timeoutId = setTimeout(searchPrincipal, 300);
    return () => clearTimeout(timeoutId);
  }, [formData.email]);

  const fetchPrincipals = async () => {
    try {
      const { getPrincipals } = await import("@/lib/fastapi-client");
      const data = await getPrincipals();
      setPrincipals(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch principals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrincipal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email && !editingPrincipal) {
      toast({
        title: "Error",
        description: "Please enter principal email",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = editingPrincipal 
        ? "update"
        : "create";
      const { createPrincipal, updatePrincipal } = await import("@/lib/fastapi-client");
      if (url === "update") {
        await updatePrincipal({
          id: editingPrincipal!._id,
          name: formData.name || undefined,
          phone: formData.phone || undefined,
          qualification: formData.qualification || undefined,
          experience: formData.experience || 0,
        });
      } else {
        await createPrincipal({
          email: formData.email,
          name: formData.name || undefined,
          phone: formData.phone || undefined,
        });
      }
        toast({
          title: "Success",
          description: editingPrincipal 
            ? "Principal updated successfully" 
            : "Principal added successfully. An invite will be sent if they don't have an account.",
        });
        setShowPrincipalDialog(false);
        setEditingPrincipal(null);
        setFormData({ email: "", name: "", phone: "", qualification: "", experience: 0 });
        setSelectedPrincipal(null);
        fetchPrincipals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || (editingPrincipal ? "Failed to update principal" : "Failed to add principal"),
        variant: "destructive",
      });
    }
  };

  const handleEditPrincipal = (principal: Principal) => {
    setEditingPrincipal(principal);
    setFormData({
      email: principal.user.email,
      name: principal.user.name,
      phone: principal.user.phone || "",
      qualification: principal.qualification || "",
      experience: principal.experience || 0,
    });
    setShowPrincipalDialog(true);
  };

  const handleDeletePrincipal = async (principalId: string) => {
    if (!confirm("Are you sure you want to delete this principal? This will remove them from any assigned campus.")) return;

    try {
      const { deletePrincipal } = await import("@/lib/fastapi-client");
      await deletePrincipal(principalId);
        toast({
          title: "Success",
          description: "Principal deleted successfully",
        });
        fetchPrincipals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete principal",
        variant: "destructive",
      });
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <nav className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" className="hover:bg-purple-50">
                  ← Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                  <UserCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Principal Management
                  </h1>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 font-medium">{session?.user?.name}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Principals</h2>
            <p className="text-gray-600">Add and manage principals for your school</p>
          </div>
          <Dialog open={showPrincipalDialog} onOpenChange={setShowPrincipalDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                Add Principal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPrincipal ? "Edit Principal" : "Add Principal"}</DialogTitle>
                <DialogDescription>
                  {editingPrincipal 
                    ? "Update principal information" 
                    : "Add a principal to your school. An invite will be sent if they don't have an account."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddPrincipal} className="space-y-4">
                {!editingPrincipal && (
                  <div className="space-y-2">
                    <Label htmlFor="principalEmail">Principal Email *</Label>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="principalEmail"
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          setSelectedPrincipal(null);
                          setShowPrincipalSuggestions(true);
                        }}
                        onFocus={() => {
                          if (principalSearchResults.length > 0) {
                            setShowPrincipalSuggestions(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowPrincipalSuggestions(false), 200);
                        }}
                        placeholder="Search principal by email..."
                        className="pl-10 pr-10"
                        required
                      />
                      {formData.email && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, email: "" });
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
                                setFormData({ ...formData, email: user.email, name: user.name });
                                setSelectedPrincipal({ email: user.email, name: user.name });
                                setShowPrincipalSuggestions(false);
                              }}
                              className="p-3 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
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
                    {formData.email.length >= 2 && !principalSearchLoading && principalSearchResults.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                        <p className="text-sm text-gray-500 text-center">
                          No principal found. An invite will be sent if the email doesn&apos;t have an account.
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
                )}
                <div className="space-y-2">
                  <Label htmlFor="principalName">Name {editingPrincipal ? "*" : "(Optional)"}</Label>
                  <Input
                    id="principalName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={editingPrincipal ? "Principal name" : "Will be extracted from email if not provided"}
                    required={!!editingPrincipal}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="principalPhone">Phone (Optional)</Label>
                  <Input
                    id="principalPhone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                {editingPrincipal && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="principalQualification">Qualification (Optional)</Label>
                      <Input
                        id="principalQualification"
                        value={formData.qualification}
                        onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                        placeholder="e.g., PhD in Education"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="principalExperience">Experience (Years)</Label>
                      <Input
                        id="principalExperience"
                        type="number"
                        min="0"
                        value={formData.experience}
                        onChange={(e) => setFormData({ ...formData, experience: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                  </>
                )}
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowPrincipalDialog(false);
                      setEditingPrincipal(null);
                      setFormData({ email: "", name: "", phone: "", qualification: "", experience: 0 });
                      setSelectedPrincipal(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">{editingPrincipal ? "Update Principal" : "Add Principal"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {principals.map((principal) => (
            <Card key={principal._id} className="overflow-hidden border-2 hover:border-purple-300 transition-all duration-300 hover:shadow-xl">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6">
                <CardHeader className="p-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-3 text-white mb-2">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                          <UserCheck className="h-6 w-6" />
                        </div>
                        <span className="text-2xl">{principal.user.name}</span>
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                          {principal.employeeId}
                        </span>
                        {principal.school && (
                          <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {principal.school.name}
                          </span>
                        )}
                        {principal.campus && (
                          <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm">
                            Campus: {principal.campus.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </div>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Email</p>
                    <p className="font-medium text-gray-900">{principal.user.email}</p>
                  </div>
                  {principal.user.phone && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Phone</p>
                      <p className="font-medium text-gray-900">{principal.user.phone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Qualification</p>
                    <p className="font-medium text-gray-900">{principal.qualification || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Experience</p>
                    <p className="font-medium text-gray-900">{principal.experience} years</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPrincipal(principal)}
                    className="flex-1"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePrincipal(principal._id)}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {principals.length === 0 && (
          <Card className="border-2 border-dashed">
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center">
                <div className="p-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full mb-4">
                  <UserCheck className="h-12 w-12 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Principals Yet</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  Get started by adding your first principal. They can be assigned to campuses when you create them.
                </p>
                <Button
                  onClick={() => setShowPrincipalDialog(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Principal
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

