"use client";

import { PointMaterial, Points } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

interface IceParticlesProps {
  count?: number;
  mouse: React.MutableRefObject<{ x: number; y: number }>;
}

export function IceParticles({ count = 800, mouse }: IceParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const { viewport } = useThree();

  // Reduce count on small viewports
  const particleCount = viewport.width < 8 ? Math.floor(count * 0.5) : count;

  // Generate particle positions, speeds, and phase offsets
  const { positions, speeds, phases, sizes } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const spd = new Float32Array(particleCount);
    const phs = new Float32Array(particleCount);
    const szs = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Spread particles in a wide volume
      pos[i * 3] = (Math.random() - 0.5) * 20; // x: -10 to 10
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14; // y: -7 to 7
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12; // z: -6 to 6

      spd[i] = 0.1 + Math.random() * 0.3; // drift speed
      phs[i] = Math.random() * Math.PI * 2; // phase offset
      szs[i] = 0.5 + Math.random() * 2.5; // size variation
    }

    return { positions: pos, speeds: spd, phases: phs, sizes: szs };
  }, [particleCount]);

  useFrame((state) => {
    if (!pointsRef.current) {
      return;
    }
    const time = state.clock.elapsedTime;

    // Gentle camera parallax following mouse
    const targetX = mouse.current.x * 0.8;
    const targetY = mouse.current.y * 0.5;
    state.camera.position.x += (targetX - state.camera.position.x) * 0.02;
    state.camera.position.y += (targetY - state.camera.position.y) * 0.02;
    state.camera.lookAt(0, 0, 0);

    // Animate particle positions
    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const speed = speeds[i];
      const phase = phases[i];

      // Sinusoidal drift on Y
      posArray[i3 + 1] += Math.sin(time * speed + phase) * 0.002;

      // Very slow upward drift
      posArray[i3 + 1] += 0.001;

      // Gentle X sway
      posArray[i3] += Math.cos(time * speed * 0.5 + phase) * 0.001;

      // Wrap particles that drift too far
      if (posArray[i3 + 1] > 7) {
        posArray[i3 + 1] = -7;
      }
      if (posArray[i3 + 1] < -7) {
        posArray[i3 + 1] = 7;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // Slow rotation of the entire field
    pointsRef.current.rotation.y = time * 0.015;
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#a5f3fc"
        size={0.05}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={1}
      />
    </Points>
  );
}

// A second, sparser layer of larger "flare" particles for depth
export function IceFlares({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) {
      return;
    }
    const time = state.clock.elapsedTime;
    pointsRef.current.rotation.y = -time * 0.008;
    pointsRef.current.rotation.x = Math.sin(time * 0.05) * 0.02;
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#22d3ee"
        size={0.12}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.8}
      />
    </Points>
  );
}
