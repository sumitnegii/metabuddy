"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import clsx from "clsx";

type MarketingFlowBackgroundProps = {
  className?: string;
  density?: "hero" | "section";
};

type TrailPoint = {
  x: number;
  y: number;
  life: number;
  color: string;
};

type FlowParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  hue: number;
};

type RibbonPoint = {
  x: number;
  y: number;
  age: number;
};

function resizeCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(width * ratio));
  canvas.height = Math.max(1, Math.floor(height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

export function MarketingFlowBackground({ className, density = "section" }: MarketingFlowBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;

    let frame = 0;
    let raf = 0;
    let width = 0;
    let height = 0;
    let pointer = { x: 0, y: 0, active: false };
    const trail: TrailPoint[] = [];
    const particles: FlowParticle[] = [];
    const particleCount = density === "hero" ? 150 : 74;
    const palette = ["#f9734f", "#10b981", "#4f8cff", "#ec4899", "#f59e0b"];

    const resetParticle = (particle?: FlowParticle): FlowParticle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * (density === "hero" ? 0.7 : 0.38),
      vy: (Math.random() - 0.5) * (density === "hero" ? 0.7 : 0.38),
      size: density === "hero" ? 1 + Math.random() * 2.3 : 0.7 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      hue: particle?.hue ?? Math.floor(Math.random() * palette.length),
    });

    const resize = () => {
      resizeCanvas(canvas, ctx);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      particles.length = 0;
      for (let i = 0; i < particleCount; i += 1) particles.push(resetParticle());
      pointer = { x: width * 0.5, y: height * 0.34, active: false };
    };

    const movePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top, active: true };
      if (density === "hero") {
        trail.push({ x: pointer.x, y: pointer.y, life: 1, color: palette[trail.length % palette.length] });
        if (trail.length > 90) trail.shift();
      }
    };

    const drawGrid = () => {
      const spacing = density === "hero" ? 42 : 58;
      const offset = (frame * 0.18) % spacing;
      ctx.save();
      ctx.globalAlpha = density === "hero" ? 0.42 : 0.22;
      ctx.strokeStyle = "rgba(15, 23, 42, 0.08)";
      ctx.lineWidth = 1;
      for (let x = -spacing + offset; x < width + spacing; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + Math.sin(frame * 0.01 + x * 0.02) * 18, height);
        ctx.stroke();
      }
      for (let y = -spacing + offset; y < height + spacing; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y + Math.cos(frame * 0.01 + y * 0.02) * 14);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawTrails = () => {
      if (trail.length < 2) return;
      ctx.save();
      ctx.lineCap = "round";
      for (let i = 1; i < trail.length; i += 1) {
        const prev = trail[i - 1];
        const point = trail[i];
        point.life -= 0.012;
        ctx.globalAlpha = Math.max(0, point.life) * 0.44;
        ctx.strokeStyle = point.color;
        ctx.lineWidth = 18 * point.life;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.quadraticCurveTo((prev.x + point.x) / 2, (prev.y + point.y) / 2, point.x, point.y);
        ctx.stroke();
      }
      while (trail[0]?.life <= 0) trail.shift();
      ctx.restore();
    };

    const drawParticles = () => {
      for (const particle of particles) {
        const wave = Math.sin(frame * 0.012 + particle.phase);
        const pullX = pointer.active ? (pointer.x - particle.x) * 0.0008 : Math.sin(frame * 0.004 + particle.phase) * 0.02;
        const pullY = pointer.active ? (pointer.y - particle.y) * 0.0008 : Math.cos(frame * 0.004 + particle.phase) * 0.02;
        particle.vx += pullX + wave * 0.018;
        particle.vy += pullY + Math.cos(frame * 0.01 + particle.phase) * 0.018;
        particle.vx *= 0.982;
        particle.vy *= 0.982;
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -12 || particle.x > width + 12 || particle.y < -12 || particle.y > height + 12) {
          Object.assign(particle, resetParticle(particle));
        }

        ctx.globalAlpha = density === "hero" ? 0.28 : 0.16;
        ctx.fillStyle = palette[particle.hue];
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * (1 + wave * 0.25), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const animate = () => {
      frame += 1;
      ctx.clearRect(0, 0, width, height);
      drawGrid();
      drawTrails();
      drawParticles();
      raf = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", movePointer, { passive: true });
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", movePointer);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={clsx("pointer-events-none absolute inset-0 h-full w-full", className)}
    />
  );
}

export function SignalShaderBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { alpha: true, antialias: true });
    if (!canvas || !gl) return;

    const vertexSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentSource = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;

      float wave(float x, float speed, float offset) {
        return sin(x * 2.2 + u_time * speed + offset) * 0.5 + sin(x * 5.0 - u_time * speed * 0.7) * 0.18;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 centered = (gl_FragCoord.xy - u_resolution.xy * 0.5) / u_resolution.x;
        float fadeX = 1.0 - smoothstep(0.0, 0.62, abs(centered.x));
        float fadeY = 1.0 - smoothstep(0.0, 0.46, abs(centered.y));

        float gridX = 1.0 - smoothstep(0.0, 0.012, abs(fract((centered.x + u_time * 0.006) * 18.0) - 0.5));
        float gridY = 1.0 - smoothstep(0.0, 0.012, abs(fract((centered.y - u_time * 0.004) * 18.0) - 0.5));
        float grid = (gridX + gridY) * 0.045 * fadeX * fadeY;

        float lineA = 1.0 - smoothstep(0.0, 0.012, abs(centered.y - wave(centered.x, 0.85, 0.0) * 0.18));
        float lineB = 1.0 - smoothstep(0.0, 0.010, abs(centered.y - wave(centered.x, 1.18, 2.4) * 0.16 - 0.12));
        float lineC = 1.0 - smoothstep(0.0, 0.009, abs(centered.y - wave(centered.x, 0.62, 4.5) * 0.14 + 0.13));

        vec3 coral = vec3(0.98, 0.36, 0.22);
        vec3 mint = vec3(0.05, 0.72, 0.50);
        vec3 sky = vec3(0.24, 0.50, 0.98);
        vec3 color = coral * lineA + mint * lineB + sky * lineC + vec3(grid);
        float alpha = (lineA + lineB + lineC) * 0.18 * fadeX + grid;

        gl_FragColor = vec4(color, min(alpha, 0.38));
      }
    `;

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertexShader || !fragmentShader || !program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const buffer = gl.createBuffer();
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    let raf = 0;
    const start = performance.now();

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = () => {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={clsx("pointer-events-none absolute inset-0 h-full w-full", className)} />;
}

export function CursorSignalTrail({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    let raf = 0;
    const colors = ["#f9734f", "#10b981", "#4f8cff", "#ec4899"];
    const ribbons = colors.map((): RibbonPoint[] => []);

    const addPoint = (event: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      ribbons.forEach((ribbon, index) => {
        ribbon.unshift({
          x: event.clientX - rect.left + (index - 1.5) * 4,
          y: event.clientY - rect.top + Math.sin(index) * 4,
          age: 1,
        });
        if (ribbon.length > 28) ribbon.pop();
      });
    };

    const pathFor = (points: RibbonPoint[], offset: number) => {
      if (points.length < 2) return "";
      return points
        .map((point, index) => {
          point.age -= 0.012 + offset * 0.002;
          const wobble = Math.sin(index * 0.7 + offset) * index * 0.28;
          return `${index === 0 ? "M" : "L"} ${point.x + wobble} ${point.y - wobble}`;
        })
        .join(" ");
    };

    const render = () => {
      const paths = Array.from(svg.querySelectorAll("path"));
      ribbons.forEach((ribbon, index) => {
        while (ribbon[0]?.age <= 0) ribbon.shift();
        const path = paths[index];
        if (!path) return;
        path.setAttribute("d", pathFor(ribbon, index));
        path.style.opacity = `${Math.min(0.56, Math.max(0, ribbon[0]?.age ?? 0) * 0.56)}`;
      });
      raf = requestAnimationFrame(render);
    };

    window.addEventListener("pointermove", addPoint, { passive: true });
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", addPoint);
    };
  }, []);

  return (
    <svg ref={svgRef} aria-hidden="true" className={clsx("pointer-events-none absolute inset-0 h-full w-full", className)}>
      {["#f9734f", "#10b981", "#4f8cff", "#ec4899"].map((color, index) => (
        <path key={color} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={14 - index * 2} />
      ))}
    </svg>
  );
}

export function CampaignConstellation({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={clsx("campaign-constellation pointer-events-none absolute inset-0", className)}>
      {Array.from({ length: 22 }).map((_, index) => (
        <span
          key={index}
          style={
            {
              "--x": `${(index * 37) % 100}%`,
              "--y": `${12 + ((index * 19) % 76)}%`,
              "--delay": `${index * -0.37}s`,
              "--size": `${2 + (index % 3)}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function CosmicCampaignHorizon({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={clsx("cosmic-campaign-horizon pointer-events-none absolute inset-x-0 bottom-0", className)}>
      <span className="cosmic-horizon-glow" />
      <span className="cosmic-horizon-core" />
    </div>
  );
}

export function EnergyRings({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={clsx("energy-rings pointer-events-none absolute inset-0", className)}>
      <span />
      <span />
      <span />
    </div>
  );
}
