import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LogoutButton from "@/components/logout-button";

export default async function ParentDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "parent") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Parent Portal</h1>
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
              <CardTitle>Child Performance</CardTitle>
              <CardDescription>View your child's academic performance</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/parent/performance">
                <Button className="w-full">View Performance</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Homework</CardTitle>
              <CardDescription>View assigned homework</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/parent/homework">
                <Button className="w-full">View Homework</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weak Subject Alerts</CardTitle>
              <CardDescription>Subjects needing attention</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/parent/alerts">
                <Button className="w-full">View Alerts</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Warnings</CardTitle>
              <CardDescription>Attendance-related alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/parent/attendance">
                <Button className="w-full">View Attendance</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Teacher Communication</CardTitle>
              <CardDescription>Communicate with teachers</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/parent/communication">
                <Button className="w-full">Contact Teachers</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

