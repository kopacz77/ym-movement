// Updated src/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Level } from "@prisma/client";

// Validation schema
const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  level: z.nativeEnum(Level),
  parentConsent: z.boolean().optional(), // Added properly inside the schema
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate request body
    const validatedData = signupSchema.parse(body);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" }, 
        { status: 409 }
      );
    }
    
    // Hash password
    const hashedPassword = await hash(validatedData.password, 10);
    
    // Create user and student profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          password: hashedPassword,
          role: "STUDENT",
        },
      });
      
      // Create the student profile
      const student = await tx.student.create({
        data: {
          userId: user.id,
          phone: validatedData.phone,
          level: validatedData.level,
          maxLessonsPerWeek: 3, // Default value
          isApproved: false,
          parentConsent: validatedData.parentConsent || false, // Use the validated data
        },
      });
      
      return { user, student };
    });
    
    // Remove password from result
    const { password, ...user } = result.user;
    
    return NextResponse.json(
      { 
        message: "User created successfully", 
        user, 
        student: result.student 
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}