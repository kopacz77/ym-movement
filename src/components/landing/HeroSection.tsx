"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center pt-32 pb-12 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,70%,25%)] via-[hsl(195,85%,45%,0.15)] to-transparent opacity-[0.07]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[hsl(195,85%,45%,0.08)] to-transparent blur-3xl" />

      <motion.div
        className="container relative px-4 text-center"
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: 0.15 }}
      >
        {/* Logo */}
        <motion.div className="mb-8" variants={fadeUp} transition={{ duration: 0.5 }}>
          <Image
            src="/ym-logo-full.svg"
            alt="YM Movement"
            width={6053}
            height={3654}
            className="mx-auto h-auto w-[280px] sm:w-[360px] md:w-[440px]"
            priority
          />
        </motion.div>

        {/* Badge */}
        <motion.div
          className="mb-6 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          <span>Olympic-level Ice Dance Coaching</span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          className="mx-auto max-w-[800px] font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          Elite Ice Dance Coaching with Yura Min
        </motion.h1>

        {/* Description */}
        <motion.p
          className="mx-auto mt-6 max-w-[600px] text-lg text-muted-foreground"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          Transform your ice dancing journey with personalized coaching, expert guidance, and a
          supportive community of dedicated skaters.
        </motion.p>

        {/* Buttons */}
        <motion.div
          className="mt-10 flex flex-col justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          <Button size="lg" className="group" asChild>
            <Link href="/auth/signup">
              Get Started
              <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/programs">See Our Programs</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/auth/login">Already a Student? Login</Link>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
