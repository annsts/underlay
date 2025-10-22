'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Tree {
  x: number;
  y: number;
  baseLength: number;
  baseWidth: number;
  hue: number;
  phase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  hue: number;
}

interface AudioVisualizerProps {
  context: AudioContext | null;
  tap: AudioNode | null;
  smoothing?: number;
  fftSize?: number;
  height?: number;
  minDecibels?: number;
  maxDecibels?: number;
  className?: string;
  treeCount?: number;
  blur?: number;
  reactivity?: number;
  idleMode?: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  context,
  tap,
  smoothing = 0.75,
  fftSize = 2048,
  height = 400,
  minDecibels = -90,
  maxDecibels = -10,
  className = '',
  treeCount = 3,
  blur = 60,
  reactivity = 1.5,
  idleMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const timeDomainArrayRef = useRef<Uint8Array | null>(null);
  const treesRef = useRef<Tree[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);


  const bassHistoryRef = useRef<number[]>([]);
  const prevOverallEnergyRef = useRef<number>(0);

  const initializeTrees = useCallback(
    (width: number, height: number) => {
      const trees: Tree[] = [];
      const spacing = width / (treeCount + 1);
      const hues = [120, 150, 180];

      for (let i = 0; i < treeCount; i++) {
        trees.push({
          x: spacing * (i + 1),
          y: height,
          baseLength: height * 0.3 + Math.random() * height * 0.1,
          baseWidth: 10 + Math.random() * 5,
          hue: hues[i % hues.length],
          phase: Math.random() * Math.PI * 2,
        });
      }

      return trees;
    },
    [treeCount]
  );

  useEffect(() => {
    if (!context || !tap || context.state === 'closed') {
      analyserRef.current = null;
      dataArrayRef.current = null;
      timeDomainArrayRef.current = null;
      setIsAnimating(idleMode);
      return;
    }

    try {
      const analyser = context.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothing;
      analyser.minDecibels = minDecibels;
      analyser.maxDecibels = maxDecibels;

      tap.connect(analyser);

      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      timeDomainArrayRef.current = new Uint8Array(analyser.fftSize);
      setIsAnimating(true);

      return () => {
        try {
          tap.disconnect(analyser);
          analyserRef.current = null;
          setIsAnimating(false);
        } catch {}
      };
    } catch (error) {
      console.warn('AudioVisualizer: Failed to initialize analyser', error);
      analyserRef.current = null;
      setIsAnimating(idleMode);
    }
  }, [context, tap, fftSize, smoothing, minDecibels, maxDecibels, idleMode]);

  const getOverallAmplitude = useCallback(
    (timeDomainData: Uint8Array): number => {
      if (!timeDomainData) return 0;
      let sum = 0;
      for (let i = 0; i < timeDomainData.length; i++) {
        const val = (timeDomainData[i] - 128) / 128;
        sum += val * val;
      }
      return Math.sqrt(sum / timeDomainData.length) * reactivity;
    },
    [reactivity]
  );

  const frequencyBounds = useRef<{ [key: string]: { start: number; end: number } }>({});

  const getFrequencyAmplitude = useCallback(
    (dataArray: Uint8Array, frequency: 'bass' | 'mid' | 'treble'): number => {
      if (!dataArray || dataArray.length === 0) return 0;

      const length = dataArray.length;
      const key = `${frequency}-${length}`;

      if (!frequencyBounds.current[key]) {
        let start = 0;
        let end = 0;

        switch (frequency) {
          case 'bass':
            start = 0;
            end = Math.floor(length * 0.023);
            break;
          case 'mid':
            start = Math.floor(length * 0.023);
            end = Math.floor(length * 0.36);
            break;
          case 'treble':
            start = Math.floor(length * 0.36);
            end = Math.floor(length * 0.73);
            break;
        }

        frequencyBounds.current[key] = { start, end };
      }

      const { start, end } = frequencyBounds.current[key];

      let sum = 0;
      let maxVal = 0;
      for (let i = start; i < end; i++) {
        sum += dataArray[i];
        maxVal = Math.max(maxVal, dataArray[i]);
      }

      const avg = sum / (end - start) / 255;
      const peak = maxVal / 255;
      return (avg * 0.5 + peak * 0.5) * reactivity;
    },
    [reactivity]
  );

  const detectBeat = useCallback(
    (dataArray: Uint8Array, timeDomainData: Uint8Array): { isBeat: boolean; isDrum: boolean } => {
      if (!dataArray || !timeDomainData) return { isBeat: false, isDrum: false };

      const bassEnd = Math.floor(dataArray.length * 0.023);
      let bassEnergy = 0;
      for (let i = 0; i < bassEnd; i++) {
        bassEnergy += dataArray[i] / 255;
      }
      bassEnergy /= bassEnd;

      bassHistoryRef.current.push(bassEnergy);
      if (bassHistoryRef.current.length > 10) bassHistoryRef.current.shift();

      const avgBass =
        bassHistoryRef.current.reduce((a, b) => a + b, 0) / bassHistoryRef.current.length;
      const bassVariance =
        bassHistoryRef.current.reduce((a, b) => a + Math.pow(b - avgBass, 2), 0) /
        bassHistoryRef.current.length;

      const overallEnergy = getOverallAmplitude(timeDomainData);
      const energyDelta = overallEnergy - prevOverallEnergyRef.current;

      const isBeat = bassEnergy > avgBass * 1.3 + Math.sqrt(bassVariance) * 0.4 && bassEnergy > 0.2;
      const isDrum = energyDelta > 0.15 * reactivity && overallEnergy > 0.25;

      prevOverallEnergyRef.current = overallEnergy;

      return { isBeat, isDrum };
    },
    [getOverallAmplitude, reactivity]
  );

  const drawBranch = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      startX: number,
      startY: number,
      len: number,
      angle: number,
      branchWidth: number,
      depth: number,
      maxDepth: number,
      amplitudes: { bass: number; mid: number; treble: number },
      isBeat: boolean,
      isDrum: boolean,
      treeHue: number,
      treePhase: number,
      idleMode: boolean
    ) => {
      if (depth > maxDepth || len < 5) {
        if (amplitudes.treble > 0.4 && Math.random() < amplitudes.treble * 0.7) {
          const glowRadius = 3 + amplitudes.treble * 5 * reactivity;
          const gradient = ctx.createRadialGradient(startX, startY, 0, startX, startY, glowRadius);
          gradient.addColorStop(0, `hsla(${treeHue + 60}, 100%, 70%, 0.8)`);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(startX, startY, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        if (isDrum && Math.random() < 0.12) {
          particlesRef.current.push({
            x: startX,
            y: startY,
            vx: (Math.random() - 0.5) * 2,
            vy: Math.random() * 2 + 1,
            life: 1,
            size: 2 + Math.random() * 2,
            hue: treeHue + Math.random() * 30 - 15,
          });
        }
        return;
      }

      ctx.lineWidth = branchWidth;
      ctx.beginPath();
      ctx.moveTo(startX, startY);

      const bend =
        Math.sin(timeRef.current * 0.001 + treePhase) * amplitudes.mid * 0.2 * reactivity;
      const midAngle = angle + (isBeat ? (Math.random() - 0.5) * 0.1 : 0) + bend;

      const endX = startX + len * Math.cos(midAngle);
      const endY = startY + len * Math.sin(midAngle);

      ctx.lineTo(endX, endY);

      const baseLightness = idleMode ? 15 : 20;
      const depthLightness = ((maxDepth - depth) / maxDepth) * (idleMode ? 25 : 30);
      const bassLightness = amplitudes.bass * (idleMode ? 12 : 10);
      const lightness = baseLightness + depthLightness + bassLightness;

      let finalHue = treeHue;
      if (idleMode) {
        const timeOffset = performance.now() * 0.001;
        const hueShift = Math.sin(timeOffset * 0.5 + depth * 0.3) * 30;
        finalHue = (treeHue + hueShift + amplitudes.mid * 40) % 360;
      }

      const saturation = 60;
      ctx.strokeStyle = `hsl(${finalHue}, ${saturation}%, ${Math.min(100, lightness)}%)`;

      ctx.stroke();

      const lengthReduction = 0.7 + amplitudes.bass * 0.1 * reactivity;
      const newLen = len * lengthReduction;
      const newWidth = branchWidth * (0.7 + amplitudes.bass * 0.05);

      const branchAngle = 20 + amplitudes.mid * 10 * reactivity;
      const leftAngle =
        midAngle + (Math.PI / 180) * branchAngle + (isDrum ? (Math.random() - 0.5) * 0.2 : 0);
      const rightAngle =
        midAngle - (Math.PI / 180) * branchAngle + (isDrum ? (Math.random() - 0.5) * 0.2 : 0);

      drawBranch(
        ctx,
        endX,
        endY,
        newLen,
        leftAngle,
        newWidth,
        depth + 1,
        maxDepth,
        amplitudes,
        isBeat,
        isDrum,
        treeHue,
        treePhase,
        idleMode
      );
      drawBranch(
        ctx,
        endX,
        endY,
        newLen,
        rightAngle,
        newWidth,
        depth + 1,
        maxDepth,
        amplitudes,
        isBeat,
        isDrum,
        treeHue,
        treePhase,
        idleMode
      );
    },
    [reactivity]
  );

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, overallEnergy: number) => {
    particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

    particlesRef.current.forEach((p) => {
      p.life -= 0.02;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.size *= 0.98;

      ctx.fillStyle = `hsla(${p.hue}, 80%, 50%, ${p.life * (0.5 + overallEnergy)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const shouldAnimate = isAnimating || idleMode;

    if (!shouldAnimate) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    if (treesRef.current.length === 0) {
      treesRef.current = initializeTrees(rect.width, height);
      bassHistoryRef.current = [];
    }

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const shouldAnimate = isAnimating || idleMode;

      if (!shouldAnimate) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        return;
      }

      frameCountRef.current++;
      const targetFrameSkip = Math.floor(60 / 24);
      if (frameCountRef.current % targetFrameSkip !== 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = Math.min(currentTime - lastTime, 100);
      lastTime = currentTime;
      timeRef.current += deltaTime;

      let amplitudes = { bass: 0, mid: 0, treble: 0 };
      let overallEnergy = 0;
      let isBeat = false;
      let isDrum = false;

      if (analyserRef.current && dataArrayRef.current && timeDomainArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>);
        analyserRef.current.getByteTimeDomainData(
          timeDomainArrayRef.current as Uint8Array<ArrayBuffer>
        );

        amplitudes = {
          bass: getFrequencyAmplitude(dataArrayRef.current, 'bass'),
          mid: getFrequencyAmplitude(dataArrayRef.current, 'mid'),
          treble: getFrequencyAmplitude(dataArrayRef.current, 'treble'),
        };

        overallEnergy = (amplitudes.bass + amplitudes.mid + amplitudes.treble) / 3;
        ({ isBeat, isDrum } = detectBeat(dataArrayRef.current, timeDomainArrayRef.current));
      } else if (idleMode) {
        const time = currentTime * 0.001;

        const bassWave1 = Math.sin(time * 0.4) * 0.5 + 0.5;
        const bassWave2 = Math.sin(time * 1.2 + 1) * 0.3;
        const midWave1 = Math.sin(time * 0.8 + 2) * 0.5 + 0.5;
        const midWave2 = Math.sin(time * 2.1 + 3) * 0.2;
        const trebleWave1 = Math.sin(time * 1.5 + 4) * 0.5 + 0.5;
        const trebleWave2 = Math.sin(time * 3.2 + 5) * 0.15;

        amplitudes = {
          bass: 0.3 + bassWave1 * 0.7 + bassWave2,
          mid: 0.25 + midWave1 * 0.6 + midWave2,
          treble: 0.2 + trebleWave1 * 0.5 + trebleWave2,
        };

        amplitudes.bass = Math.max(0, amplitudes.bass);
        amplitudes.mid = Math.max(0, amplitudes.mid);
        amplitudes.treble = Math.max(0, amplitudes.treble);

        overallEnergy = (amplitudes.bass + amplitudes.mid + amplitudes.treble) / 3;
        isBeat = Math.sin(time * 2.2) > 0.4;
        isDrum = Math.sin(time * 1.1 + 1) > 0.7;
      }
      const baseFade = 0.05;
      const fadeAlpha = Math.max(0.005, baseFade - overallEnergy * 0.03 * reactivity);
      ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
      ctx.fillRect(0, 0, rect.width, height);

      ctx.globalCompositeOperation = 'screen';
      treesRef.current.forEach((tree) => {
        const maxDepth = Math.min(6, 5 + Math.floor(amplitudes.bass * 1.2 * reactivity));
        drawBranch(
          ctx,
          tree.x,
          tree.y,
          tree.baseLength + amplitudes.bass * 50,
          -Math.PI / 2,
          tree.baseWidth,
          0,
          maxDepth,
          amplitudes,
          isBeat,
          isDrum,
          tree.hue,
          tree.phase,
          idleMode
        );
      });

      particlesRef.current = particlesRef.current.slice(0, 60);
      drawParticles(ctx, overallEnergy);

      ctx.globalCompositeOperation = 'source-over';

      animationRef.current = requestAnimationFrame(animate);
    };

    animate(performance.now());

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [
    height,
    isAnimating,
    initializeTrees,
    drawBranch,
    drawParticles,
    getFrequencyAmplitude,
    detectBeat,
    reactivity,
    idleMode,
  ]);

  return (
    <div className={`relative w-full ${className}`} style={{ height: `${height}px` }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          filter: `blur(${blur}px)`,
          opacity: 0.8,
          mixBlendMode: 'screen',
          willChange: 'transform',
        }}
      />
    </div>
  );
};

export default AudioVisualizer;
