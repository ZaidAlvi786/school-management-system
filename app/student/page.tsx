import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LogoutButton from "@/components/logout-button";

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "student") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Student Portal</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{session.user.name}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>My Grades</CardTitle>
              <CardDescription>View your grades and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/student/grades">
                <Button className="w-full">View Grades</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Performance Forecast</CardTitle>
              <CardDescription>AI prediction of your performance</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/student/forecast">
                <Button className="w-full">View Forecast</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance</CardTitle>
              <CardDescription>View your attendance record</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/student/attendance">
                <Button className="w-full">View Attendance</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Syllabus Progress</CardTitle>
              <CardDescription>Track syllabus completion</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/student/syllabus">
                <Button className="w-full">View Syllabus</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Homework</CardTitle>
              <CardDescription>View assigned homework</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/student/homework">
                <Button className="w-full">View Homework</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Materials</CardTitle>
              <CardDescription>Access study materials</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/student/materials">
                <Button className="w-full">View Materials</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

