import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../lib/db";
import User from "../lib/models/User";
import School from "../lib/models/School";
import Principal from "../lib/models/Principal";
import Teacher from "../lib/models/Teacher";
import Student from "../lib/models/Student";
import Parent from "../lib/models/Parent";
import Campus from "../lib/models/Campus";
import Class from "../lib/models/Class";
import Section from "../lib/models/Section";
import Subject from "../lib/models/Subject";

async function seed() {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await School.deleteMany({});
    await Principal.deleteMany({});
    await Teacher.deleteMany({});
    await Student.deleteMany({});
    await Parent.deleteMany({});
    await Campus.deleteMany({});
    await Class.deleteMany({});
    await Section.deleteMany({});
    await Subject.deleteMany({});

    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create Principal
    const principalUser = await User.create({
      email: "principal@school.com",
      password: hashedPassword,
      role: "principal",
      name: "Dr. Ahmed Khan",
      phone: "+92-300-1234567",
      isActive: true,
    });

    // Create School
    const school = await School.create({
      name: "Government High School",
      code: "GHS-001",
      address: "Main Street, Islamabad",
      city: "Islamabad",
      province: "Punjab",
      principal: principalUser._id,
      type: "government",
    });

    const principal = await Principal.create({
      user: principalUser._id,
      employeeId: "EMP-001",
      school: school._id,
      qualification: "PhD in Education",
      experience: 15,
    });

    // Create Campus
    const campus = await Campus.create({
      name: "Main Campus",
      school: school._id,
      address: "Main Street, Islamabad",
      incharge: null,
    });

    // Create Classes
    const class9 = await Class.create({
      name: "Class 9",
      level: 9,
      campus: campus._id,
      classIncharge: null,
    });

    const class10 = await Class.create({
      name: "Class 10",
      level: 10,
      campus: campus._id,
      classIncharge: null,
    });

    // Create Sections
    const sectionA9 = await Section.create({
      name: "A",
      class: class9._id,
      capacity: 40,
      currentStrength: 0,
    });

    const sectionB9 = await Section.create({
      name: "B",
      class: class9._id,
      capacity: 40,
      currentStrength: 0,
    });

    // Create Teachers
    const teacher1User = await User.create({
      email: "teacher1@school.com",
      password: hashedPassword,
      role: "teacher",
      name: "Ms. Fatima Ali",
      phone: "+92-300-2345678",
      isActive: true,
    });

    const teacher2User = await User.create({
      email: "teacher2@school.com",
      password: hashedPassword,
      role: "teacher",
      name: "Mr. Hassan Raza",
      phone: "+92-300-3456789",
      isActive: true,
    });

    const teacher1 = await Teacher.create({
      user: teacher1User._id,
      employeeId: "EMP-002",
      school: school._id,
      subjects: [],
      qualification: "MSc Mathematics",
      experience: 8,
    });

    const teacher2 = await Teacher.create({
      user: teacher2User._id,
      employeeId: "EMP-003",
      school: school._id,
      subjects: [],
      qualification: "MSc Physics",
      experience: 6,
    });

    // Create Subjects
    const mathSubject = await Subject.create({
      name: "Mathematics",
      code: "MATH-9",
      class: class9._id,
      teacher: teacher1._id,
    });

    const physicsSubject = await Subject.create({
      name: "Physics",
      code: "PHY-9",
      class: class9._id,
      teacher: teacher2._id,
    });

    // Update teachers with subjects
    teacher1.subjects.push(mathSubject._id);
    await teacher1.save();

    teacher2.subjects.push(physicsSubject._id);
    await teacher2.save();

    // Create Parents
    const parent1User = await User.create({
      email: "parent1@email.com",
      password: hashedPassword,
      role: "parent",
      name: "Mr. Ali Ahmed",
      phone: "+92-300-4567890",
      isActive: true,
    });

    const parent1 = await Parent.create({
      user: parent1User._id,
      cnic: "35202-1234567-1",
      occupation: "Engineer",
    });

    // Create Students
    const student1User = await User.create({
      email: "student1@school.com",
      password: hashedPassword,
      role: "student",
      name: "Ahmed Ali",
      phone: "+92-300-5678901",
      isActive: true,
    });

    const student1 = await Student.create({
      user: student1User._id,
      rollNumber: "2024-001",
      admissionNumber: "ADM-2024-001",
      class: class9._id,
      section: sectionA9._id,
      parent: parent1._id,
      dateOfBirth: new Date("2010-05-15"),
      address: "House 123, Street 45, Islamabad",
    });

    sectionA9.currentStrength = 1;
    await sectionA9.save();

    const student2User = await User.create({
      email: "student2@school.com",
      password: hashedPassword,
      role: "student",
      name: "Sara Ahmed",
      phone: "+92-300-6789012",
      isActive: true,
    });

    const student2 = await Student.create({
      user: student2User._id,
      rollNumber: "2024-002",
      admissionNumber: "ADM-2024-002",
      class: class9._id,
      section: sectionA9._id,
      parent: parent1._id,
      dateOfBirth: new Date("2010-07-20"),
      address: "House 456, Street 78, Islamabad",
    });

    sectionA9.currentStrength = 2;
    await sectionA9.save();

    // Create Admin User
    await User.create({
      email: "admin@school.com",
      password: hashedPassword,
      role: "admin",
      name: "System Admin",
      phone: "+92-300-9999999",
      isActive: true,
    });

    console.log("Seed data created successfully!");
    console.log("\nTest Credentials:");
    console.log("Principal: principal@school.com / password123");
    console.log("Teacher 1: teacher1@school.com / password123");
    console.log("Teacher 2: teacher2@school.com / password123");
    console.log("Student 1: student1@school.com / password123");
    console.log("Student 2: student2@school.com / password123");
    console.log("Parent 1: parent1@email.com / password123");
    console.log("Admin: admin@school.com / password123");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();

