// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { prisma } from "@/lib/prisma";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("Authorizing credentials:", credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing email or password");
          throw new Error("Email and password required");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
          include: {
            student: true,
          },
        });

        console.log("User found:", !!user);
        
        if (!user || !user.password) {
          console.log("User not found or has no password");
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await compare(credentials.password, user.password);
        console.log("Password valid:", isPasswordValid);
        
        if (!isPasswordValid) {
          console.log("Invalid password");
          throw new Error("Invalid credentials");
        }

        // For students, check if they're approved
        if (user.role === 'STUDENT' && user.student) {
          console.log("Student approval check:", user.student.isApproved);
          
          if (!user.student.isApproved) {
            throw new Error("Your account is pending approval by an administrator");
          }
        }

        console.log("Authentication successful for:", user.email);
        
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  debug: true, // Set to true to see detailed logs
});

export { handler as GET, handler as POST };