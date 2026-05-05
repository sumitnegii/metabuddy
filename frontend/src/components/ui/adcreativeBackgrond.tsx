"use client";

import type { ReactNode } from "react";

type AdCreativeBackgroundProps = {
  children: ReactNode;
  className?: string;
};

export function AdCreativeBackground({ children, className = "" }: AdCreativeBackgroundProps) {
  return (
    <main
      className={`relative min-h-screen overflow-hidden bg-zinc-950 ${className}`}
      style={{
        backgroundImage: "url('https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/ruixen_moon_2.png')",
        backgroundAttachment: "fixed",
        backgroundPosition: "center top",
        backgroundSize: "cover",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(9,9,11,0.58),rgba(9,9,11,0.86)_38%,rgba(244,244,245,0.96)_56%,rgba(255,255,255,0.98))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_72%_16%,rgba(249,115,22,0.14),transparent_34%),radial-gradient(circle_at_22%_8%,rgba(212,212,216,0.16),transparent_30%)]" />
      <div className="relative z-10">{children}</div>
    </main>
  );
}

export default AdCreativeBackground;
