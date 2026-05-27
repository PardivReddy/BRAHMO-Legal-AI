'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}

interface ParticlesBackgroundProps {
  className?: string;
  particleCount?: number;
}

function ParticlesBackground({ className = '', particleCount = 28 }: ParticlesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let frameId: number;
    let width = 0;
    let height = 0;
    const dpr = window.devicePixelRatio || 1;

    const initializeParticles = () => {
      particlesRef.current = Array.from({ length: particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
        radius: Math.random() * 1.1 + 0.6,
        alpha: Math.random() * 0.16 + 0.08,
      }));
    };

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      initializeParticles();
    };

    const animate = () => {
      context.clearRect(0, 0, width, height);
      context.save();
      context.globalCompositeOperation = 'source-over';
      context.fillStyle = 'rgba(255,255,255,0.02)';
      context.fillRect(0, 0, width, height);
      context.restore();

      const lineThreshold = 110;
      for (let i = 0; i < particlesRef.current.length; i += 1) {
        const particle = particlesRef.current[i];
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0) particle.x = width;
        if (particle.x > width) particle.x = 0;
        if (particle.y < 0) particle.y = height;
        if (particle.y > height) particle.y = 0;

        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(255,255,255,${particle.alpha})`;
        context.fill();
      }

      for (let i = 0; i < particlesRef.current.length; i += 1) {
        const a = particlesRef.current[i];
        for (let j = i + 1; j < particlesRef.current.length; j += 1) {
          const b = particlesRef.current[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < lineThreshold) {
            const alpha = (1 - distance / lineThreshold) * 0.08;
            context.strokeStyle = `rgba(255,255,255,${alpha})`;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
          }
        }
      }

      frameId = window.requestAnimationFrame(animate);
    };

    resizeCanvas();
    frameId = window.requestAnimationFrame(animate);

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [particleCount]);

  return <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full opacity-1000 ${className}`} />;
}

export default ParticlesBackground;
