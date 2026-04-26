"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-[#0f172a] overflow-hidden pt-20">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/yura-min1.jpeg"
          alt="Figure skater on ice"
          fill
          className="object-cover opacity-20"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-[#0f172a]" />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 text-center px-4 max-w-4xl mx-auto"
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: 0.15 }}
      >
        {/* Large wordmark */}
        <motion.div
          className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          YM MOVEMENT
        </motion.div>

        {/* Heading */}
        <motion.h1
          className="font-display text-3xl sm:text-4xl md:text-6xl text-white font-bold leading-tight mb-6"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          Elite Ice Dance Coaching
          <br />
          with Yura Min
        </motion.h1>

        {/* Description */}
        <motion.p
          className="text-lg md:text-2xl text-slate-300 max-w-2xl mx-auto mb-10"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          Experience Olympic-level training designed for precision and performance.
        </motion.p>

        {/* Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          <Link
            href="/auth/signup"
            className="group inline-flex items-center justify-center bg-gradient-to-r from-cyan-500 to-[#0891b2] text-white font-bold px-8 py-4 rounded-lg hover:scale-105 transition-all duration-200 shadow-[0_0_20px_rgba(8,145,178,0.4)]"
          >
            Sign Up
            <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/programs"
            className="inline-flex items-center justify-center border border-white text-white font-bold px-8 py-4 rounded-lg hover:bg-white/10 transition-all duration-200"
          >
            Learn More
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
