export class AudioAnalyser extends EventTarget {
  readonly node: AnalyserNode;
  private readonly freqData: Uint8Array;
  private readonly timeData: Uint8Array;
  private rafId: number | null = null;

  constructor(context: AudioContext) {
    super();
    this.node = context.createAnalyser();
    this.node.smoothingTimeConstant = 0.8;
    this.node.fftSize = 256;
    this.freqData = new Uint8Array(this.node.frequencyBinCount);
    this.timeData = new Uint8Array(this.node.frequencyBinCount);
    this.loop = this.loop.bind(this);
  }

  getCurrentLevel(): number {
    this.node.getByteFrequencyData(this.freqData as Uint8Array<ArrayBuffer>);
    const average = Array.from(this.freqData).reduce((acc, value) => acc + value, 0) / this.freqData.length;
    return average / 0xff;
  }

  getFrequencyData(): Uint8Array {
    this.node.getByteFrequencyData(this.freqData as Uint8Array<ArrayBuffer>);
    return this.freqData;
  }

  getTimeData(): Uint8Array {
    this.node.getByteTimeDomainData(this.timeData as Uint8Array<ArrayBuffer>);
    return this.timeData;
  }

  private loop() {
    this.rafId = requestAnimationFrame(this.loop);

    const level = this.getCurrentLevel();
    const freqData = this.getFrequencyData();
    const timeData = this.getTimeData();

    this.dispatchEvent(new CustomEvent('audio-level-changed', { detail: level }));
    this.dispatchEvent(new CustomEvent('frequency-data', { detail: freqData }));
    this.dispatchEvent(new CustomEvent('time-data', { detail: timeData }));
  }

  start = this.loop;

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  isRunning(): boolean {
    return this.rafId !== null;
  }
}
