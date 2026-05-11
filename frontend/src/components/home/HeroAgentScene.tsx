"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

type AgentProps = {
  position: [number, number, number];
  accent: string;
  device: "phone" | "laptop" | "monitor";
  delay?: number;
};

function Agent({ position, accent, device, delay = 0 }: AgentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const accentColor = useMemo(() => new THREE.Color(accent), [accent]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime + delay;
    groupRef.current.position.y = position[1] + Math.sin(time * 1.4) * 0.08;
    groupRef.current.rotation.y = Math.sin(time * 0.7) * 0.08;
  });

  return (
    <group ref={groupRef} position={position} scale={1.08}>
      <mesh position={[0, 1.95, 0]} castShadow>
        <sphereGeometry args={[0.48, 48, 32]} />
        <meshStandardMaterial color="#e7eef6" roughness={0.38} metalness={0.18} />
      </mesh>

      <mesh position={[0, 1.96, 0.43]} castShadow>
        <boxGeometry args={[0.62, 0.3, 0.06]} />
        <meshStandardMaterial color="#101827" roughness={0.24} metalness={0.24} emissive={accentColor} emissiveIntensity={0.18} />
      </mesh>

      <mesh position={[-0.15, 1.98, 0.47]}>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0.15, 1.98, 0.47]}>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.2} />
      </mesh>

      <mesh position={[-0.52, 1.96, 0]} castShadow>
        <sphereGeometry args={[0.12, 24, 16]} />
        <meshStandardMaterial color="#aebacc" roughness={0.4} metalness={0.28} />
      </mesh>
      <mesh position={[0.52, 1.96, 0]} castShadow>
        <sphereGeometry args={[0.12, 24, 16]} />
        <meshStandardMaterial color="#aebacc" roughness={0.4} metalness={0.28} />
      </mesh>

      <mesh position={[0, 1.15, 0]} castShadow>
        <capsuleGeometry args={[0.42, 0.78, 16, 32]} />
        <meshStandardMaterial color="#dbe5ef" roughness={0.42} metalness={0.16} />
      </mesh>

      <mesh position={[0, 1.33, 0.42]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.05, 32]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.35} roughness={0.25} metalness={0.1} />
      </mesh>

      <mesh position={[-0.48, 1.14, 0.1]} rotation={[0.2, 0, -0.55]} castShadow>
        <capsuleGeometry args={[0.08, 0.72, 12, 20]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.42} metalness={0.18} />
      </mesh>
      <mesh position={[0.48, 1.14, 0.1]} rotation={[0.2, 0, 0.55]} castShadow>
        <capsuleGeometry args={[0.08, 0.72, 12, 20]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.42} metalness={0.18} />
      </mesh>

      <mesh position={[-0.18, 0.45, 0]} rotation={[0, 0, 0.08]} castShadow>
        <capsuleGeometry args={[0.12, 0.72, 12, 20]} />
        <meshStandardMaterial color="#b9c6d5" roughness={0.48} metalness={0.12} />
      </mesh>
      <mesh position={[0.18, 0.45, 0]} rotation={[0, 0, -0.08]} castShadow>
        <capsuleGeometry args={[0.12, 0.72, 12, 20]} />
        <meshStandardMaterial color="#b9c6d5" roughness={0.48} metalness={0.12} />
      </mesh>

      {device === "phone" ? (
        <mesh position={[0.18, 0.95, 0.66]} rotation={[0.1, -0.2, -0.12]} castShadow>
          <boxGeometry args={[0.36, 0.72, 0.06]} />
          <meshStandardMaterial color="#111827" roughness={0.22} metalness={0.3} emissive={accentColor} emissiveIntensity={0.08} />
        </mesh>
      ) : null}

      {device === "laptop" ? (
        <group position={[0, 0.78, 0.65]} rotation={[-0.16, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.98, 0.58, 0.06]} />
            <meshStandardMaterial color="#0f172a" roughness={0.24} metalness={0.28} emissive={accentColor} emissiveIntensity={0.08} />
          </mesh>
          <mesh position={[0, -0.36, 0.22]} rotation={[1.15, 0, 0]} castShadow>
            <boxGeometry args={[1.14, 0.54, 0.05]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.38} metalness={0.22} />
          </mesh>
        </group>
      ) : null}

      {device === "monitor" ? (
        <group position={[0, 0.98, 0.68]}>
          <mesh castShadow>
            <boxGeometry args={[0.9, 0.6, 0.07]} />
            <meshStandardMaterial color="#111827" roughness={0.24} metalness={0.28} emissive={accentColor} emissiveIntensity={0.08} />
          </mesh>
          <mesh position={[0, -0.42, -0.02]} castShadow>
            <boxGeometry args={[0.12, 0.26, 0.08]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.42} metalness={0.16} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

function Workbench() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.32) * 0.035;
  });

  return (
    <group ref={groupRef} rotation={[0.08, 0, 0]}>
      <mesh position={[0, 0.16, 0]} receiveShadow castShadow>
        <boxGeometry args={[5.6, 0.22, 1.9]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.34} metalness={0.05} />
      </mesh>

      <group position={[0, 1.08, -0.52]} rotation={[-0.08, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[2.6, 1.42, 0.08]} />
          <meshStandardMaterial color="#ffffff" roughness={0.22} metalness={0.08} />
        </mesh>
        <mesh position={[0, 0.12, 0.055]}>
          <planeGeometry args={[2.32, 0.9]} />
          <meshStandardMaterial color="#dff7ee" roughness={0.5} emissive="#10b981" emissiveIntensity={0.08} />
        </mesh>
      </group>

      <Agent position={[-2.0, 0.16, 0.18]} accent="#f9734f" device="phone" delay={0.2} />
      <Agent position={[0, 0.32, 0.04]} accent="#10b981" device="laptop" delay={1.1} />
      <Agent position={[2.05, 0.14, 0.18]} accent="#4f8cff" device="monitor" delay={2.0} />
    </group>
  );
}

export function HeroAgentScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 2.25, 6.3], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.75]}
    >
      <ambientLight intensity={1.15} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-3, 2.4, 3]} intensity={1.1} color="#f9734f" />
      <pointLight position={[3, 2.2, 3]} intensity={1} color="#4f8cff" />
      <Workbench />
    </Canvas>
  );
}
