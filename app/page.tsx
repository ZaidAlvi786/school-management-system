import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    const role = session.user.role;
    if (role === "admin") {
      redirect("/admin");
    } else if (role === "principal") {
      redirect("/principal");
    } else if (role === "teacher") {
      redirect("/teacher");
    } else if (role === "student") {
      redirect("/student");
    } else if (role === "parent") {
      redirect("/parent");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl w-full px-4">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            School Management System
          </h1>
          <p className="text-xl text-gray-600">
            AI-Powered Educational Platform
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>For Administrators</CardTitle>
              <CardDescription>
                Manage school, campus, classes, and view AI insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full">Admin Portal</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>For Teachers</CardTitle>
              <CardDescription>
                Manage grades, syllabus, generate papers, and track attendance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full">Teacher Portal</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>For Students</CardTitle>
              <CardDescription>
                View grades, attendance, homework, and AI performance forecast
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full">Student Portal</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>For Parents</CardTitle>
              <CardDescription>
                Monitor child performance, homework, and communicate with teachers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full">Parent Portal</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

