'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface ShaderVisualizerProps {
  context: AudioContext | null;
  tap: AudioNode | null;
  smoothing?: number;
  fftSize?: number;
  className?: string;
  grainIntensity?: number;
  colorShift?: boolean;
  idleMode?: boolean;
}

const ShaderVisualizer: React.FC<ShaderVisualizerProps> = ({
  context,
  tap,
  smoothing = 0.85,
  fftSize = 2048,
  className = '',
  grainIntensity = 0.15,
  colorShift = true,
  idleMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const targetFPS = 30;
  const frameDuration = 1000 / targetFPS;
  const audioThrottleRef = useRef<number>(0);
  const cachedAudioRef = useRef<{ low: number; mid: number; high: number }>({
    low: 0,
    mid: 0,
    high: 0,
  });

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      glRef.current = null;
      programRef.current = null;
    };
  }, []);

  const vertexShaderSource = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentShaderSource = `
    precision highp float;
    uniform vec2 resolution;
    uniform float time;
    uniform float audioLow;
    uniform float audioMid;
    uniform float audioHigh;
    uniform float grainIntensity;
    uniform bool colorShift;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float grain(vec2 uv, float time) {
      vec2 seed = uv * resolution + time;
      return hash(seed);
    }

    float detailGrain(vec2 uv, float time) {
      vec2 seed = uv * resolution * 2.5 + time * 10.0;
      return hash(seed);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);

      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));

      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      value += 0.5 * noise(p);
      value += 0.25 * noise(p * 2.0);
      value += 0.125 * noise(p * 4.0);
      return value;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution;
      vec2 center = vec2(0.5, 0.5);
      vec2 toCenter = uv - center;
      float dist = length(toCenter);

      float wave1 = sin(dist * 10.0 - time * 0.5 + audioLow * 3.0) * audioLow;
      float wave2 = sin(dist * 15.0 + time * 0.3 + audioMid * 2.0) * audioMid;
      float wave3 = sin(dist * 20.0 - time * 0.7 + audioHigh * 4.0) * audioHigh;

      float waves = (wave1 + wave2 + wave3) * 0.2;

      vec2 fbmCoord = uv * 3.0 + vec2(time * 0.05, time * 0.03);
      fbmCoord += vec2(audioLow * 0.5, audioMid * 0.3);
      float pattern = fbm(fbmCoord);

      float radial = 1.0 - smoothstep(0.0, 0.8, dist);
      radial *= (0.5 + audioLow * 0.5);

      float intensity = pattern * 0.4 + waves * 0.3 + radial * 0.3;
      intensity = clamp(intensity, 0.0, 1.0);

      intensity = pow(intensity, 0.88);

      vec3 color;
      if(colorShift) {
        float hue = time * 0.1 + audioMid * 0.5;
        float basePhase = hue + intensity * 2.0;
        vec3 phases = basePhase + vec3(audioLow, audioMid + 2.0, audioHigh + 4.0);
        color = 0.5 + 0.5 * sin(phases);
      } else {
        color = vec3(0.7 + intensity * 0.3, 0.6 + intensity * 0.4, 0.8 + intensity * 0.2);
      }

      color *= intensity;

      // Simplified grain - single layer instead of two for better performance
      float grainValue = (grain(uv, time) - 0.5) * grainIntensity;
      color += grainValue;

      float vignette = smoothstep(1.2, 0.3, dist);
      color *= vignette;

      float boost = 0.5 + (audioLow + audioMid + audioHigh) * 0.4;
      color *= boost;

      gl_FragColor = vec4(color, 0.9);
    }
  `;

  const initWebGL = useCallback(() => {
    if (!canvasRef.current) return false;

    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
      desynchronized: true,
    });

    if (!gl) {
      console.warn('WebGL not supported');
      return false;
    }

    glRef.current = gl;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) return false;

    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
      return false;
    }

    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
      return false;
    }

    const program = gl.createProgram();
    if (!program) return false;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return false;
    }

    programRef.current = program;
    gl.useProgram(program);

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    return true;
  }, [vertexShaderSource, fragmentShaderSource]);

  useEffect(() => {
    if (!context || !tap) {
      analyserRef.current = null;
      dataArrayRef.current = null;
      return;
    }

    try {
      const analyser = context.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothing;
      tap.connect(analyser);

      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      return () => {
        try {
          tap.disconnect(analyser);
        } catch {}
      };
    } catch (error) {
      console.warn('Failed to initialize audio analyser:', error);
    }
  }, [context, tap, fftSize, smoothing]);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    if (!glRef.current || !programRef.current) {
      if (!initWebGL()) {
        console.error('Failed to initialize WebGL');
        return;
      }
    }

    const gl = glRef.current;
    const program = programRef.current;
    if (!gl || !program) {
      return;
    }

    const getAdaptiveDPR = () => {
      const basePixelRatio = window.devicePixelRatio || 1;
      const screenWidth = window.innerWidth;

      if (screenWidth < 1920) {
        return Math.min(basePixelRatio, 2) * 0.55;
      } else if (screenWidth < 2560) {
        return Math.min(basePixelRatio, 1.5) * 0.45;
      } else {
        return Math.min(basePixelRatio, 1.5) * 0.35;
      }
    };

    const dpr = getAdaptiveDPR();
    const rect = canvasRef.current.getBoundingClientRect();
    canvasRef.current.width = rect.width * dpr;
    canvasRef.current.height = rect.height * dpr;
    gl.viewport(0, 0, canvasRef.current.width, canvasRef.current.height);

    const resolutionLocation = gl.getUniformLocation(program, 'resolution');
    const timeLocation = gl.getUniformLocation(program, 'time');
    const audioLowLocation = gl.getUniformLocation(program, 'audioLow');
    const audioMidLocation = gl.getUniformLocation(program, 'audioMid');
    const audioHighLocation = gl.getUniformLocation(program, 'audioHigh');
    const grainIntensityLocation = gl.getUniformLocation(program, 'grainIntensity');
    const colorShiftLocation = gl.getUniformLocation(program, 'colorShift');

    gl.uniform2f(resolutionLocation, canvasRef.current.width, canvasRef.current.height);
    gl.uniform1f(grainIntensityLocation, grainIntensity);
    gl.uniform1i(colorShiftLocation, colorShift ? 1 : 0);

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      if (!gl || !program) return;

      const elapsed = currentTime - lastFrameTimeRef.current;
      if (elapsed < frameDuration) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameTimeRef.current = currentTime - (elapsed % frameDuration);

      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      timeRef.current += deltaTime * 0.001;

      let audioLow = cachedAudioRef.current.low;
      let audioMid = cachedAudioRef.current.mid;
      let audioHigh = cachedAudioRef.current.high;

      audioThrottleRef.current++;
      if (audioThrottleRef.current % 3 === 0) {
        if (analyserRef.current && dataArrayRef.current) {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>);

          const dataArray = dataArrayRef.current;
          const length = dataArray.length;

          const bassEnd = Math.floor(length * 0.1);
          const midEnd = Math.floor(length * 0.4);

          audioLow = 0;
          audioMid = 0;
          audioHigh = 0;

          for (let i = 0; i < bassEnd; i++) audioLow += dataArray[i];
          for (let i = bassEnd; i < midEnd; i++) audioMid += dataArray[i];
          for (let i = midEnd; i < length; i++) audioHigh += dataArray[i];

          audioLow = (audioLow / bassEnd / 255) * 2;
          audioMid = (audioMid / (midEnd - bassEnd) / 255) * 2;
          audioHigh = (audioHigh / (length - midEnd) / 255) * 2;

          cachedAudioRef.current = { low: audioLow, mid: audioMid, high: audioHigh };
        } else if (idleMode) {
          const t = timeRef.current;
          audioLow = 0.3 + Math.sin(t * 0.5) * 0.3;
          audioMid = 0.4 + Math.sin(t * 0.7 + 1) * 0.3;
          audioHigh = 0.2 + Math.sin(t * 1.1 + 2) * 0.2;

          cachedAudioRef.current = { low: audioLow, mid: audioMid, high: audioHigh };
        }
      }

      gl.uniform1f(timeLocation, timeRef.current);
      gl.uniform1f(audioLowLocation, audioLow);
      gl.uniform1f(audioMidLocation, audioMid);
      gl.uniform1f(audioHighLocation, audioHigh);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [grainIntensity, colorShift, idleMode, initWebGL, frameDuration]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        opacity: 0.6,
        zIndex: 99999,
        willChange: 'transform',
      }}
    />
  );
};

export default ShaderVisualizer;
