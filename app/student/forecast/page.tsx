"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import { TrendingUp, Sparkles, Target, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Forecast {
  predictedGrade: string;
  confidence: string;
  factors: string[];
  recommendations: string[];
}

export default function StudentForecastPage() {
  const { data: session, status } = useSession();
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
      fetchForecast();
    }
  }, [status]);

  const fetchForecast = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const response = await fetch("/api/student/forecast");
      if (response.ok) {
        const data = await response.json();
        setForecast(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to generate forecast");
      }
    } catch (error: any) {
      console.error("Failed to fetch forecast:", error);
      setError("Failed to generate forecast. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade.includes("A")) return "from-emerald-500 to-green-500";
    if (grade.includes("B")) return "from-blue-500 to-cyan-500";
    if (grade.includes("C")) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-500";
  };

  const getConfidenceColor = (confidence: string) => {
    if (confidence.toLowerCase().includes("high")) return "bg-gradient-to-r from-emerald-500 to-green-500";
    if (confidence.toLowerCase().includes("medium")) return "bg-gradient-to-r from-yellow-500 to-orange-500";
    return "bg-gradient-to-r from-red-500 to-pink-500";
  };

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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Header with animated gradient background */}
          <div className="mb-6 md:mb-8 animate-slide-up relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-indigo-600/10 rounded-3xl blur-3xl"></div>
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
              <div className="p-3 md:p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg transform hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-pink-900 bg-clip-text text-transparent">
                  AI Performance Forecast
                </h1>
                <p className="text-gray-600 mt-1 text-sm md:text-base">Predict your academic performance with AI</p>
              </div>
              <div className="hidden sm:block">
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl">
                  <Sparkles className="h-6 w-6 text-purple-600 animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50/50 to-pink-50/50 animate-slide-up hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-red-700 font-medium text-sm md:text-base">{error}</p>
                  </div>
                </div>
                <Button 
                  onClick={fetchForecast} 
                  variant="outline"
                  className="border-2 hover:bg-red-50 transition-colors"
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Try Again"
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : forecast ? (
            <div className="grid gap-6 md:gap-8">
              {/* Predicted Grade Card with enhanced styling */}
              <Card className="border-2 hover:shadow-2xl transition-all duration-500 animate-slide-up hover:scale-[1.01] overflow-hidden group relative">
                <div className={`absolute inset-0 bg-gradient-to-r ${getGradeColor(forecast.predictedGrade)} opacity-5 group-hover:opacity-10 transition-opacity duration-500`}></div>
                
                <div className={`bg-gradient-to-r ${getGradeColor(forecast.predictedGrade)} p-[3px] group-hover:p-[4px] transition-all duration-300`}>
                  <CardContent className="bg-white p-6 md:p-8 lg:p-10 relative">
                    {/* Decorative elements */}
                    <div className={`absolute top-4 right-4 w-32 h-32 bg-gradient-to-br ${getGradeColor(forecast.predictedGrade)} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity duration-300`}></div>
                    
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className={`p-4 md:p-6 bg-gradient-to-br ${getGradeColor(forecast.predictedGrade)} rounded-2xl shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300`}>
                          <Sparkles className="h-8 w-8 md:h-12 md:w-12 text-white animate-pulse" />
                        </div>
                        <div>
                          <CardDescription className="text-base md:text-lg mb-2 text-gray-600">Predicted Overall Grade</CardDescription>
                          <CardTitle className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-3 group-hover:scale-105 transition-transform duration-300 inline-block">
                            {forecast.predictedGrade}
                          </CardTitle>
                          <div className="flex items-center gap-3">
                            <Badge className={`${getConfidenceColor(forecast.confidence)} text-white border-0 shadow-lg text-xs md:text-sm px-4 py-2`}>
                              {forecast.confidence} Confidence
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>

              {/* Key Factors */}
              {forecast.factors && forecast.factors.length > 0 && (
                <Card className="border-2 hover:shadow-2xl transition-all duration-500 animate-slide-up hover:scale-[1.01] overflow-hidden group relative" style={{ animationDelay: "0.1s" }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <CardHeader className="relative z-10">
                    <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-300"></div>
                    
                    <CardTitle className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-3 relative z-10">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                        <Target className="h-5 w-5 md:h-6 md:w-6 text-white" />
                      </div>
                      Key Performance Factors
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base mt-2">Factors influencing your predicted performance</CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="grid gap-3 md:gap-4">
                      {forecast.factors.map((factor, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 md:gap-4 p-4 md:p-5 rounded-xl border-2 bg-gradient-to-r from-purple-50/50 to-pink-50/50 hover:from-purple-100/50 hover:to-pink-100/50 hover:shadow-md transition-all duration-300 group/item"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mt-0.5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-300">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                          <p className="text-gray-700 flex-1 text-sm md:text-base">{factor}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {forecast.recommendations && forecast.recommendations.length > 0 && (
                <Card className="border-2 hover:shadow-2xl transition-all duration-500 animate-slide-up hover:scale-[1.01] overflow-hidden group relative" style={{ animationDelay: "0.2s" }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <CardHeader className="relative z-10">
                    <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-emerald-500 to-green-500 opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-300"></div>
                    
                    <CardTitle className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-3 relative z-10">
                      <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-lg">
                        <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-white" />
                      </div>
                      Recommendations for Improvement
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base mt-2">Personalized suggestions to enhance your performance</CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="grid gap-3 md:gap-4">
                      {forecast.recommendations.map((recommendation, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 md:gap-4 p-4 md:p-5 rounded-xl border-2 bg-gradient-to-r from-emerald-50/50 to-green-50/50 hover:from-emerald-100/50 hover:to-green-100/50 hover:shadow-md transition-all duration-300 group/item"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full mt-0.5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-300">
                            <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-white" />
                          </div>
                          <p className="text-gray-700 flex-1 text-sm md:text-base">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Refresh Button */}
              <div className="flex justify-center animate-slide-up" style={{ animationDelay: "0.3s" }}>
                <Button
                  onClick={fetchForecast}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-base md:text-lg"
                  size="lg"
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <>
                      <RefreshCw className="h-4 w-4 md:h-5 md:w-5 mr-2 animate-spin" />
                      Generating Forecast...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                      Refresh Forecast
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <Card className="border-2 animate-slide-up hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <CardContent className="py-12 md:py-16 text-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50"></div>
                <div className="relative z-10">
                  <div className="p-4 md:p-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 flex items-center justify-center shadow-lg animate-pulse">
                    <TrendingUp className="h-10 w-10 md:h-12 md:w-12 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">No Forecast Available</h3>
                  <p className="text-gray-600 text-sm md:text-base mb-6">Generate an AI-powered performance forecast</p>
                  <Button
                    onClick={fetchForecast}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={refreshing}
                  >
                    {refreshing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Forecast"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
