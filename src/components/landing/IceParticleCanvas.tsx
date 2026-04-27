"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useCallback, useEffect, useRef, useState } from "react";
import { IceFlares, IceParticles } from "./IceParticles";

export default function IceParticleCanvas() {
  const mouse = useRef({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Normalize to -1..1
    mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, []);

  if (reducedMotion) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-0" onMouseMove={handleMouseMove}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 2]}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        {/* Ambient fill light */}
        <ambientLight intensity={0.3} />

        {/* Main particle field — small, dense, ice-dust */}
        <IceParticles count={800} mouse={mouse} />

        {/* Secondary flare layer — fewer, larger, cyan glow */}
        <IceFlares mouse={mouse} />

        {/* Bloom post-processing for the glow */}
        <EffectComposer>
          <Bloom
            intensity={2.0}
            luminanceThreshold={0.05}
            luminanceSmoothing={0.9}
            mipmapBlur
            radius={0.8}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
