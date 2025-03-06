// src/app/auth/signup/page.tsx
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Level } from '@prisma/client';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState<Level>(Level.PRE_PRELIMINARY);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          email,
          password,
          phone,
          level
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      toast({
        title: "Account Created",
        description: "Your account has been created and is pending approval. You'll receive an email when approved.",
      });

      // Redirect to login page after successful signup
      router.push('/auth/login');
    } catch (error) {
      toast({
        title: "Signup Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Join YM Movement</CardTitle>
          <CardDescription>Create a new student account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input 
                id="phone" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Skating Level</Label>
              <Select value={level} onValueChange={(value: Level) => setLevel(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your level" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Level).map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>
                      {lvl.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing up..." : "Sign Up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-sm text-center text-gray-500">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}