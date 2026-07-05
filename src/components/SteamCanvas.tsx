'use client';

import { useEffect, useRef } from 'react';

export default function SteamCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Respect OS settings for reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      return; // Stop animation loop immediately
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    interface Particle {
      x: number;
      y: number;
      radius: number;
      speedY: number;
      speedX: number;
      opacity: number;
      fadeSpeed: number;
    }

    const particles: Particle[] = [];

    const createParticle = (): Particle => {
      return {
        x: canvas.width / 2 + (Math.random() - 0.5) * 10,
        y: canvas.height - 2,
        radius: Math.random() * 6 + 3,
        speedY: Math.random() * 0.3 + 0.15,
        speedX: (Math.random() - 0.5) * 0.1,
        opacity: Math.random() * 0.25 + 0.05,
        fadeSpeed: Math.random() * 0.002 + 0.001,
      };
    };

    // Pre-populate particles at random heights to avoid a slow start
    for (let i = 0; i < 4; i++) {
      particles.push({
        ...createParticle(),
        y: Math.random() * (canvas.height - 10),
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (particles.length < 6 && Math.random() < 0.02) {
        particles.push(createParticle());
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.y -= p.speedY;
        p.x += p.speedX;
        p.opacity -= p.fadeSpeed;

        if (p.opacity <= 0 || p.y < 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        // Soft white/cream steam with a touch of brand-accent
        gradient.addColorStop(0, `rgba(224, 134, 42, ${p.opacity})`);
        gradient.addColorStop(0.3, `rgba(251, 244, 233, ${p.opacity * 0.5})`);
        gradient.addColorStop(1, 'rgba(251, 244, 233, 0)');
        
        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={40}
      height={40}
      className="pointer-events-none absolute -top-5 left-[5.5rem] z-10"
      title="Fresh steam"
    />
  );
}
