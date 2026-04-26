"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// Dynamically import the Three.js canvas — no SSR, lazy loaded
const IceParticleCanvas = dynamic(() => import("./IceParticleCanvas"), {
  ssr: false,
  loading: () => null, // Dark bg already visible, no flash
});

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-[#0f172a] overflow-hidden pt-20">
      {/* Layer 1: Photo backdrop — very subtle human presence */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/yura-min1.jpeg"
          alt=""
          fill
          className="object-cover opacity-[0.08]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/70 to-[#0f172a]" />
      </div>

      {/* Layer 2: Three.js ice crystal particles with bloom */}
      <IceParticleCanvas />

      {/* Layer 3: Radial glow behind content */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/[0.06] blur-[120px]" />
      </div>

      {/* Layer 4: Content */}
      <motion.div
        className="relative z-10 text-center px-4 max-w-4xl mx-auto"
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: 0.15, delayChildren: 0.3 }}
      >
        {/* YM Movement Logo */}
        <motion.div className="mb-10" variants={fadeUp} transition={{ duration: 0.6 }}>
          <Image
            src="/ym-logo-full.svg"
            alt="YM Movement"
            width={6053}
            height={3654}
            className="mx-auto h-auto w-[260px] sm:w-[340px] md:w-[420px] drop-shadow-[0_0_30px_rgba(34,211,238,0.15)]"
            priority
          />
        </motion.div>

        {/* Heading */}
        <motion.h1
          className="font-display text-3xl sm:text-4xl md:text-6xl text-white font-bold leading-tight mb-6 drop-shadow-lg"
          variants={fadeUp}
          transition={{ duration: 0.6 }}
        >
          Elite Ice Dance Coaching
          <br />
          with Yura Min
        </motion.h1>

        {/* Description */}
        <motion.p
          className="text-lg md:text-2xl text-slate-300 max-w-2xl mx-auto mb-10"
          variants={fadeUp}
          transition={{ duration: 0.6 }}
        >
          Experience Olympic-level training designed for precision and performance.
        </motion.p>

        {/* Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          variants={fadeUp}
          transition={{ duration: 0.6 }}
        >
          <Link
            href="/auth/signup"
            className="group inline-flex items-center justify-center bg-gradient-to-r from-cyan-500 to-[#0891b2] text-white font-bold px-8 py-4 rounded-lg hover:scale-105 transition-all duration-200 shadow-[0_0_30px_rgba(8,145,178,0.5)]"
          >
            Sign Up
            <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/programs"
            className="inline-flex items-center justify-center border border-white/30 text-white font-bold px-8 py-4 rounded-lg hover:bg-white/10 hover:border-white/50 transition-all duration-200 backdrop-blur-sm"
          >
            Learn More
          </Link>
        </motion.div>
      </motion.div>

      {/* Bottom gradient fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0f172a] to-transparent z-10 pointer-events-none" />
    </section>
  );
}
