/**
 * Audio Visualizer Engine
 *
 * Captures system audio and creates real-time frequency visualizations.
 * Supports multiple visualization styles: bars, wave, circular, particles.
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
  private source: MediaStreamAudioSourceNode | null = null
  private animationId: number = 0
  private config: VisualizerConfig = { ...DEFAULT_CONFIG }
  private frequencyData: Uint8Array = new Uint8Array(0)
  private smoothedData: Float32Array = new Float32Array(0)

  async init(canvas: HTMLCanvasElement, config?: Partial<VisualizerConfig>): Promise<boolean> {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    if (config) {
      this.config = { ...this.config, ...config }
    }

    try {
      // Capture system audio (requires user permission)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // @ts-ignore - These constraints help capture desktop audio
          mandatory: {
            chromeMediaSource: 'desktop'
          }
        }
      }).catch(async () => {
        // Fallback: try regular audio capture
        return navigator.mediaDevices.getUserMedia({ audio: true })
      })

      this.audioContext = new AudioContext()
      this.source = this.audioContext.createMediaStreamSource(stream)
      this.analyser = this.audioContext.createAnalyser()

      this.analyser.fftSize = 2048
      this.analyser.smoothingTimeConstant = this.config.smoothing

      this.source.connect(this.analyser)

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount)
      this.smoothedData = new Float32Array(this.analyser.frequencyBinCount)

      return true
    } catch (error) {
      console.error('Failed to initialize audio capture:', error)
      // Run in demo mode with simulated data
      this.frequencyData = new Uint8Array(1024)
      this.smoothedData = new Float32Array(1024)
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

  private render = (): void => {
    this.animationId = requestAnimationFrame(this.render)

    if (!this.canvas || !this.ctx) return

    const { width, height } = this.canvas

    // Get frequency data
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData)
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
  }

  private renderBars(width: number, height: number): void {
    if (!this.ctx) return
    const { barCount, sensitivity, colorStart, colorEnd, opacity, mirror } = this.config

    const barWidth = width / barCount
    const gradient = this.ctx.createLinearGradient(0, height, 0, 0)
    gradient.addColorStop(0, colorStart)
    gradient.addColorStop(1, colorEnd)

    this.ctx.globalAlpha = opacity
    this.ctx.fillStyle = gradient

    const step = Math.floor(this.smoothedData.length / barCount)

    for (let i = 0; i < barCount; i++) {
      const value = this.smoothedData[i * step] * sensitivity
      const barHeight = (value / 255) * height * 0.8

      const x = i * barWidth
      const y = height - barHeight

      // Main bar
      this.ctx.fillRect(x + 1, y, barWidth - 2, barHeight)

      // Mirror (reflection)
      if (mirror) {
        this.ctx.globalAlpha = opacity * 0.3
        this.ctx.fillRect(x + 1, height, barWidth - 2, barHeight * 0.3)
        this.ctx.globalAlpha = opacity
      }
    }
  }

  private renderWave(width: number, height: number): void {
    if (!this.ctx) return
    const { sensitivity, colorStart, colorEnd, opacity } = this.config

    const gradient = this.ctx.createLinearGradient(0, 0, width, 0)
    gradient.addColorStop(0, colorStart)
    gradient.addColorStop(1, colorEnd)

    this.ctx.globalAlpha = opacity
    this.ctx.strokeStyle = gradient
    this.ctx.lineWidth = 3
    this.ctx.beginPath()

    const sliceWidth = width / this.smoothedData.length
    let x = 0

    for (let i = 0; i < this.smoothedData.length; i++) {
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

    // Filled area under wave
    this.ctx.globalAlpha = opacity * 0.1
    this.ctx.lineTo(width, height)
    this.ctx.lineTo(0, height)
    this.ctx.fillStyle = gradient
    this.ctx.fill()
  }

  private renderCircular(width: number, height: number): void {
    if (!this.ctx) return
    const { barCount, sensitivity, colorStart, colorEnd, opacity } = this.config

    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.25
    const step = Math.floor(this.smoothedData.length / barCount)

    this.ctx.globalAlpha = opacity

    for (let i = 0; i < barCount; i++) {
      const value = this.smoothedData[i * step] * sensitivity
      const barHeight = (value / 255) * radius

      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2
      const x1 = centerX + Math.cos(angle) * radius
      const y1 = centerY + Math.sin(angle) * radius
      const x2 = centerX + Math.cos(angle) * (radius + barHeight)
      const y2 = centerY + Math.sin(angle) * (radius + barHeight)

      const hue = (i / barCount) * 120 + 240 // Purple to blue range
      this.ctx.strokeStyle = `hsla(${hue}, 70%, 65%, ${opacity})`
      this.ctx.lineWidth = (Math.PI * 2 * radius) / barCount - 1
      this.ctx.beginPath()
      this.ctx.moveTo(x1, y1)
      this.ctx.lineTo(x2, y2)
      this.ctx.stroke()
    }

    // Center circle glow
    const avgFreq = Array.from(this.smoothedData.slice(0, 20)).reduce((a, b) => a + b, 0) / 20
    const glowRadius = radius * 0.4 + (avgFreq / 255) * radius * 0.2

    const glow = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius)
    glow.addColorStop(0, `${colorStart}80`)
    glow.addColorStop(1, 'transparent')
    this.ctx.fillStyle = glow
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2)
    this.ctx.fill()
  }

  private particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; life: number }> = []

  private renderParticles(width: number, height: number): void {
    if (!this.ctx) return
    const { sensitivity, colorStart, opacity } = this.config

    // Get average bass frequency
    const bass = Array.from(this.smoothedData.slice(0, 10)).reduce((a, b) => a + b, 0) / 10

    // Spawn new particles based on bass intensity
    if (bass * sensitivity > 100) {
      for (let i = 0; i < Math.floor(bass / 50); i++) {
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
    this.ctx.globalAlpha = opacity
    this.particles = this.particles.filter(p => p.life > 0)

    for (const p of this.particles) {
      p.x += p.vx
      p.y += p.vy
      p.life -= 0.015
      p.size *= 0.998

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
  }

  private time = 0
  private simulateAudioData(): void {
    this.time += 0.05
    for (let i = 0; i < this.frequencyData.length; i++) {
      const freq = i / this.frequencyData.length
      this.frequencyData[i] = Math.floor(
        (Math.sin(this.time * 2 + freq * 10) * 0.5 + 0.5) *
        (1 - freq * 0.8) * 200 +
        Math.random() * 30
      )
    }
  }

  destroy(): void {
    this.stop()
    if (this.audioContext) {
      this.audioContext.close()
    }
    this.source = null
    this.analyser = null
    this.audioContext = null
    this.particles = []
  }
}
