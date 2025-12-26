"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LogoutButton from "@/components/logout-button";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { Brain, AlertTriangle, TrendingDown, Clock } from "lucide-react";

interface Insight {
  _id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  recommendations: string[];
  createdAt: string;
  student?: {
    user?: {
      name: string;
    };
  };
  teacher?: {
    user?: {
      name: string;
    };
  };
  class?: {
    name: string;
  };
}

export default function InsightsPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

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
      fetchInsights();
    }
  }, [status]);

  const fetchInsights = async () => {
    try {
      const res = await fetch("/api/admin/insights");
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch insights",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "" }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "AI insights generated successfully",
        });
        fetchInsights();
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to generate insights",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate insights",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "weak_student":
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      case "weak_teacher":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "syllabus_delay":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Brain className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-red-500 bg-red-50";
      case "medium":
        return "border-orange-500 bg-orange-50";
      default:
        return "border-yellow-500 bg-yellow-50";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50">
      <nav className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" className="hover:bg-orange-50">
                  ← Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    AI Insights
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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">AI-Generated Insights</h2>
            <p className="text-gray-600">
              {session?.user?.role === "admin" 
                ? "View AI-generated insights and recommendations (Read-only)" 
                : "Intelligent analysis and recommendations powered by AI"}
            </p>
          </div>
          {session?.user?.role !== "admin" && (
            <Button
              onClick={handleGenerateInsights}
              disabled={generating}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg"
            >
              <Brain className="mr-2 h-4 w-4" />
              {generating ? "Generating..." : "Generate Insights"}
            </Button>
          )}
        </div>

        <div className="grid gap-6">
          {insights.map((insight) => (
            <Card
              key={insight._id}
              className={`border-l-4 ${getSeverityColor(insight.severity)} hover:shadow-xl transition-all duration-300 overflow-hidden`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${
                        insight.severity === "high" ? "bg-red-100" :
                        insight.severity === "medium" ? "bg-orange-100" : "bg-yellow-100"
                      }`}>
                        {getIcon(insight.type)}
                      </div>
                      <span className="text-xl">{insight.title}</span>
                    </CardTitle>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                        {insight.type.replace("_", " ").toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        insight.severity === "high" ? "bg-red-100 text-red-700" :
                        insight.severity === "medium" ? "bg-orange-100 text-orange-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {insight.severity.toUpperCase()}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                        {new Date(insight.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-gray-700 leading-relaxed">{insight.description}</p>
                {insight.recommendations && insight.recommendations.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-semibold mb-3 text-gray-900 flex items-center gap-2">
                      <span>💡</span>
                      Recommendations:
                    </h4>
                    <ul className="space-y-2">
                      {insight.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-orange-500 mt-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {insights.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No insights generated yet.</p>
              <Button onClick={handleGenerateInsights} disabled={generating}>
                Generate AI Insights
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
