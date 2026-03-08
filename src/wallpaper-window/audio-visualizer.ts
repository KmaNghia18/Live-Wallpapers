/**
 * Audio Visualizer Engine
 *
 * Captures system audio and creates real-time frequency visualizations.
 * Supports multiple visualization styles: bars, wave, circular, particles.
 *
 * In Electron: uses desktopCapturer to capture system audio.
 * Fallback: runs demo mode with simulated audio data.
 */

export type VisualizerStyle = 'bars' | 'wave' | 'circular' | 'particles'

interface VisualizerConfig {
  style: VisualizerStyle
  barCount: number
  smoothing: number
  sensitivity: number
  colorStart: string
  colorEnd: string
  opacity: number
  mirror: boolean
}

const DEFAULT_CONFIG: VisualizerConfig = {
  style: 'bars',
  barCount: 64,
  smoothing: 0.8,
  sensitivity: 1.0,
  colorStart: '#6c5ce7',
  colorEnd: '#a29bfe',
  opacity: 0.8,
  mirror: true
}

export class AudioVisualizer {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null
  private animationId: number = 0
  private config: VisualizerConfig = { ...DEFAULT_CONFIG }
  private frequencyData: Uint8Array = new Uint8Array(0)
  private smoothedData: Float32Array = new Float32Array(0)
  private isDemoMode: boolean = false

  async init(canvas: HTMLCanvasElement, config?: Partial<VisualizerConfig>): Promise<boolean> {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    if (config) {
      this.config = { ...this.config, ...config }
    }

    try {
      // In Electron, use desktopCapturer to get system audio
      let stream: MediaStream | null = null

      // Try Electron desktopCapturer first (captures system audio)
      if (typeof (window as any).electronDesktopCapturer !== 'undefined') {
        const sources = await (window as any).electronDesktopCapturer.getSources({ types: ['screen'] })
        if (sources && sources.length > 0) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              // @ts-ignore - Electron-specific constraints for desktop audio
              mandatory: {
                chromeMediaSource: 'desktop'
              }
            },
            video: {
              // @ts-ignore
              mandatory: {
                chromeMediaSource: 'desktop',
                maxWidth: 1,
                maxHeight: 1
              }
            }
          })
          // Remove video track, we only need audio
          stream.getVideoTracks().forEach(track => track.stop())
        }
      }

      // Fallback: try regular microphone audio
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch {
          // No audio source available
          stream = null
        }
      }

      if (!stream || stream.getAudioTracks().length === 0) {
        throw new Error('No audio source available')
      }

      this.audioContext = new AudioContext()
      this.source = this.audioContext.createMediaStreamSource(stream)
      this.analyser = this.audioContext.createAnalyser()

      this.analyser.fftSize = 2048
      this.analyser.smoothingTimeConstant = this.config.smoothing
      this.analyser.minDecibels = -90
      this.analyser.maxDecibels = -10

      this.source.connect(this.analyser)
      // Don't connect analyser to destination (no audio output feedback)

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount)
      this.smoothedData = new Float32Array(this.analyser.frequencyBinCount)
      this.isDemoMode = false

      return true
    } catch (error) {
      console.warn('Audio capture unavailable, running in demo mode:', error)
      // Run in demo mode with simulated data
      this.frequencyData = new Uint8Array(1024)
      this.smoothedData = new Float32Array(1024)
      this.isDemoMode = true
      return false
    }
  }

  start(): void {
    if (this.animationId) return
    this.render()
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = 0
    }
  }

  setConfig(config: Partial<VisualizerConfig>): void {
    this.config = { ...this.config, ...config }
    if (this.analyser && config.smoothing !== undefined) {
      this.analyser.smoothingTimeConstant = config.smoothing
    }
  }

  getIsDemoMode(): boolean {
    return this.isDemoMode
  }

  private render = (): void => {
    this.animationId = requestAnimationFrame(this.render)

    if (!this.canvas || !this.ctx) return

    const { width, height } = this.canvas

    // Get frequency data
    if (this.analyser && !this.isDemoMode) {
      this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>)
    } else {
      // Demo mode: simulate audio data
      this.simulateAudioData()
    }

    // Apply smoothing
    for (let i = 0; i < this.frequencyData.length; i++) {
      this.smoothedData[i] += (this.frequencyData[i] - this.smoothedData[i]) * (1 - this.config.smoothing)
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height)

    // Reset globalAlpha before rendering
    this.ctx.globalAlpha = 1.0

    // Render based on style
    switch (this.config.style) {
      case 'bars':
        this.renderBars(width, height)
        break
      case 'wave':
        this.renderWave(width, height)
        break
      case 'circular':
        this.renderCircular(width, height)
        break
      case 'particles':
        this.renderParticles(width, height)
        break
    }

    // Always reset globalAlpha after rendering
    this.ctx.globalAlpha = 1.0
  }

  private renderBars(width: number, height: number): void {
    if (!this.ctx) return
    const { barCount, sensitivity, colorStart, colorEnd, opacity, mirror } = this.config

    const barWidth = width / barCount
    const gradient = this.ctx.createLinearGradient(0, height, 0, 0)
    gradient.addColorStop(0, colorStart)
    gradient.addColorStop(1, colorEnd)

    this.ctx.fillStyle = gradient

    const step = Math.max(1, Math.floor(this.smoothedData.length / barCount))

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.min(i * step, this.smoothedData.length - 1)
      const value = this.smoothedData[dataIndex] * sensitivity
      const barHeight = (value / 255) * height * 0.8

      const x = i * barWidth
      const y = height - barHeight

      // Main bar
      this.ctx.globalAlpha = opacity
      this.ctx.fillRect(x + 1, y, barWidth - 2, barHeight)

      // Mirror (reflection below)
      if (mirror) {
        this.ctx.globalAlpha = opacity * 0.3
        this.ctx.fillRect(x + 1, height, barWidth - 2, barHeight * 0.3)
      }
    }
    this.ctx.globalAlpha = 1.0
  }

  private renderWave(width: number, height: number): void {
    if (!this.ctx) return
    const { sensitivity, colorStart, colorEnd, opacity } = this.config

    const gradient = this.ctx.createLinearGradient(0, 0, width, 0)
    gradient.addColorStop(0, colorStart)
    gradient.addColorStop(1, colorEnd)

    // Draw wave line
    this.ctx.globalAlpha = opacity
    this.ctx.strokeStyle = gradient
    this.ctx.lineWidth = 3
    this.ctx.beginPath()

    const dataLength = this.smoothedData.length
    const sliceWidth = width / dataLength
    let x = 0

    for (let i = 0; i < dataLength; i++) {
      const value = this.smoothedData[i] * sensitivity
      const y = height / 2 + ((value - 128) / 128) * (height / 3)

      if (i === 0) {
        this.ctx.moveTo(x, y)
      } else {
        this.ctx.lineTo(x, y)
      }
      x += sliceWidth
    }

    this.ctx.stroke()

    // Filled area under wave — new path to avoid artifact
    this.ctx.globalAlpha = opacity * 0.1
    this.ctx.beginPath()
    x = 0
    for (let i = 0; i < dataLength; i++) {
      const value = this.smoothedData[i] * sensitivity
      const y = height / 2 + ((value - 128) / 128) * (height / 3)
      if (i === 0) this.ctx.moveTo(x, y)
      else this.ctx.lineTo(x, y)
      x += sliceWidth
    }
    this.ctx.lineTo(width, height)
    this.ctx.lineTo(0, height)
    this.ctx.closePath()
    this.ctx.fillStyle = gradient
    this.ctx.fill()

    this.ctx.globalAlpha = 1.0
  }

  private renderCircular(width: number, height: number): void {
    if (!this.ctx) return
    const { barCount, sensitivity, colorStart, opacity } = this.config

    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.25
    const step = Math.max(1, Math.floor(this.smoothedData.length / barCount))

    this.ctx.globalAlpha = opacity

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.min(i * step, this.smoothedData.length - 1)
      const value = this.smoothedData[dataIndex] * sensitivity
      const barHeight = (value / 255) * radius

      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2
      const x1 = centerX + Math.cos(angle) * radius
      const y1 = centerY + Math.sin(angle) * radius
      const x2 = centerX + Math.cos(angle) * (radius + barHeight)
      const y2 = centerY + Math.sin(angle) * (radius + barHeight)

      const hue = (i / barCount) * 120 + 240
      this.ctx.strokeStyle = `hsla(${hue}, 70%, 65%, ${opacity})`
      this.ctx.lineWidth = Math.max(1, (Math.PI * 2 * radius) / barCount - 1)
      this.ctx.beginPath()
      this.ctx.moveTo(x1, y1)
      this.ctx.lineTo(x2, y2)
      this.ctx.stroke()
    }

    // Center circle glow
    const sliceEnd = Math.min(20, this.smoothedData.length)
    const avgFreq = Array.from(this.smoothedData.slice(0, sliceEnd)).reduce((a, b) => a + b, 0) / sliceEnd
    const glowRadius = radius * 0.4 + (avgFreq / 255) * radius * 0.2

    if (glowRadius > 0) {
      const glow = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius)
      glow.addColorStop(0, `${colorStart}80`)
      glow.addColorStop(1, 'transparent')
      this.ctx.fillStyle = glow
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2)
      this.ctx.fill()
    }

    this.ctx.globalAlpha = 1.0
  }

  private particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; life: number }> = []

  private renderParticles(width: number, height: number): void {
    if (!this.ctx) return
    const { sensitivity, colorStart, opacity } = this.config

    // Get average bass frequency (guard against empty array)
    const bassEnd = Math.min(10, this.smoothedData.length)
    const bass = bassEnd > 0
      ? Array.from(this.smoothedData.slice(0, bassEnd)).reduce((a, b) => a + b, 0) / bassEnd
      : 0

    // Spawn new particles based on bass intensity
    if (bass * sensitivity > 100) {
      const spawnCount = Math.min(Math.floor(bass / 50), 10) // cap spawn rate
      for (let i = 0; i < spawnCount; i++) {
        this.particles.push({
          x: width / 2 + (Math.random() - 0.5) * 100,
          y: height / 2 + (Math.random() - 0.5) * 100,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          size: Math.random() * 4 + 1,
          life: 1.0
        })
      }
    }

    // Update and render particles
    this.particles = this.particles.filter(p => p.life > 0)

    for (const p of this.particles) {
      p.x += p.vx
      p.y += p.vy
      p.life -= 0.015
      p.size *= 0.998

      if (p.size < 0.1) continue // Skip tiny particles

      this.ctx.globalAlpha = p.life * opacity
      this.ctx.fillStyle = colorStart
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      this.ctx.fill()
    }

    // Limit particle count
    if (this.particles.length > 500) {
      this.particles = this.particles.slice(-500)
    }

    this.ctx.globalAlpha = 1.0
  }

  private time = 0
  private simulateAudioData(): void {
    this.time += 0.05
    for (let i = 0; i < this.frequencyData.length; i++) {
      const freq = i / this.frequencyData.length
      const value = (Math.sin(this.time * 2 + freq * 10) * 0.5 + 0.5) *
        (1 - freq * 0.8) * 200 +
        Math.random() * 30
      this.frequencyData[i] = Math.min(255, Math.max(0, Math.floor(value)))
    }
  }

  destroy(): void {
    this.stop()
    if (this.source) {
      try { this.source.disconnect() } catch { /* ignore */ }
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => { /* ignore */ })
    }
    this.source = null
    this.analyser = null
    this.audioContext = null
    this.particles = []
    this.canvas = null
    this.ctx = null
  }
}
