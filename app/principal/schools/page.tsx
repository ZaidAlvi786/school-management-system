"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import Link from "next/link";
import { Building2 } from "lucide-react";

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

export default function PrincipalSchoolsPage() {
  const { data: session, status } = useSession();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
    if (status === "authenticated" && session?.user?.role !== "principal") {
      redirect("/");
    }
  }, [status, session]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchSchools();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const fetchSchools = async () => {
    try {
      const res = await fetch("/api/admin/schools");
      if (res.ok) {
        const data = await res.json();
        setSchools(data);
      }
    } catch (error) {
      console.error("Failed to fetch schools", error);
    } finally {
      setLoading(false);
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
        <div className="mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">School & Campuses</h2>
            <p className="text-gray-600">View your school information and campuses (Read-only)</p>
          </div>
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
                          className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-100"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 mb-1">{campus.name}</p>
                            <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                              <span>📍</span>
                              {campus.address || school.address}
                            </p>
                            {campus.principal?.user && (
                              <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
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
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No School Found</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  Your school should have been assigned. Please contact support if you don&apos;t see your school.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </main>
    </div>
  );
}

