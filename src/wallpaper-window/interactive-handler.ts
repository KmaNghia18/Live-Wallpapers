/**
 * Interactive Wallpaper Handler
 *
 * Captures mouse and keyboard input to create interactive effects
 * on wallpapers: parallax, ripples, particles following cursor, etc.
 */

export type InteractionMode = 'parallax' | 'ripple' | 'particle-trail' | 'repel' | 'none'

interface InteractiveConfig {
  mode: InteractionMode
  intensity: number // 0 to 1
  color: string
  particleCount: number
}

interface Ripple {
  x: number
  y: number
  radius: number
  maxRadius: number
  opacity: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  color: string
}

const DEFAULT_CONFIG: InteractiveConfig = {
  mode: 'parallax',
  intensity: 0.5,
  color: '#6c5ce7',
  particleCount: 30
}

export class InteractiveHandler {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private config: InteractiveConfig = { ...DEFAULT_CONFIG }
  private animationId: number = 0
  private mouseX: number = 0
  private mouseY: number = 0
  private prevMouseX: number = 0
  private prevMouseY: number = 0
  private isMouseDown: boolean = false

  private ripples: Ripple[] = []
  private particles: Particle[] = []

  private boundMouseMove: (e: MouseEvent) => void
  private boundMouseDown: (e: MouseEvent) => void
  private boundMouseUp: () => void
  private boundKeyDown: (e: KeyboardEvent) => void

  constructor() {
    this.boundMouseMove = this.onMouseMove.bind(this)
    this.boundMouseDown = this.onMouseDown.bind(this)
    this.boundMouseUp = this.onMouseUp.bind(this)
    this.boundKeyDown = this.onKeyDown.bind(this)
  }

  init(canvas: HTMLCanvasElement, config?: Partial<InteractiveConfig>): void {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    if (config) {
      this.config = { ...this.config, ...config }
    }

    // Add event listeners
    document.addEventListener('mousemove', this.boundMouseMove)
    document.addEventListener('mousedown', this.boundMouseDown)
    document.addEventListener('mouseup', this.boundMouseUp)
    document.addEventListener('keydown', this.boundKeyDown)
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

  setConfig(config: Partial<InteractiveConfig>): void {
    this.config = { ...this.config, ...config }
  }

  private onMouseMove(e: MouseEvent): void {
    this.prevMouseX = this.mouseX
    this.prevMouseY = this.mouseY
    this.mouseX = e.clientX
    this.mouseY = e.clientY

    // Generate particles on mouse trail
    if (this.config.mode === 'particle-trail') {
      const speed = Math.sqrt(
        Math.pow(this.mouseX - this.prevMouseX, 2) +
        Math.pow(this.mouseY - this.prevMouseY, 2)
      )
      if (speed > 2) {
        this.spawnTrailParticles(e.clientX, e.clientY, Math.min(speed / 5, 5))
      }
    }
  }

  private onMouseDown(e: MouseEvent): void {
    this.isMouseDown = true

    if (this.config.mode === 'ripple') {
      this.ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        maxRadius: 200 * this.config.intensity,
        opacity: 0.8
      })
    }

    if (this.config.mode === 'repel') {
      // Burst of particles from click point
      for (let i = 0; i < this.config.particleCount; i++) {
        const angle = (Math.PI * 2 * i) / this.config.particleCount
        const speed = 3 + Math.random() * 5
        this.particles.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 4,
          life: 1.0,
          color: this.config.color
        })
      }
    }
  }

  private onMouseUp(): void {
    this.isMouseDown = false
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Create a burst effect on key press
    if (this.config.mode !== 'none' && this.canvas) {
      const centerX = this.canvas.width / 2
      const centerY = this.canvas.height / 2

      this.ripples.push({
        x: centerX,
        y: centerY,
        radius: 0,
        maxRadius: 300,
        opacity: 0.3
      })
    }
  }

  private spawnTrailParticles(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2 - 1,
        size: 1 + Math.random() * 3,
        life: 1.0,
        color: this.config.color
      })
    }
  }

  private render = (): void => {
    this.animationId = requestAnimationFrame(this.render)

    if (!this.canvas || !this.ctx) return
    const { width, height } = this.canvas

    this.ctx.clearRect(0, 0, width, height)

    switch (this.config.mode) {
      case 'parallax':
        this.renderParallax(width, height)
        break
      case 'ripple':
        this.renderRipples()
        break
      case 'particle-trail':
        this.renderParticles()
        break
      case 'repel':
        this.renderParticles()
        break
    }
  }

  private renderParallax(width: number, height: number): void {
    if (!this.ctx) return

    // Create a subtle vignette that follows mouse
    const normalX = this.mouseX / width
    const normalY = this.mouseY / height
    const offsetX = (normalX - 0.5) * 30 * this.config.intensity
    const offsetY = (normalY - 0.5) * 30 * this.config.intensity

    // Light spot following mouse
    const gradient = this.ctx.createRadialGradient(
      this.mouseX, this.mouseY, 0,
      this.mouseX, this.mouseY, 300
    )
    gradient.addColorStop(0, `${this.config.color}15`)
    gradient.addColorStop(1, 'transparent')

    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, width, height)
  }

  private renderRipples(): void {
    if (!this.ctx) return

    this.ripples = this.ripples.filter(r => r.opacity > 0.01)

    for (const ripple of this.ripples) {
      ripple.radius += 3
      ripple.opacity *= 0.97

      this.ctx.strokeStyle = `${this.config.color}`
      this.ctx.globalAlpha = ripple.opacity
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2)
      this.ctx.stroke()

      // Inner ring
      if (ripple.radius > 20) {
        this.ctx.globalAlpha = ripple.opacity * 0.5
        this.ctx.beginPath()
        this.ctx.arc(ripple.x, ripple.y, ripple.radius * 0.6, 0, Math.PI * 2)
        this.ctx.stroke()
      }
    }
    this.ctx.globalAlpha = 1
  }

  private renderParticles(): void {
    if (!this.ctx) return

    this.particles = this.particles.filter(p => p.life > 0)

    for (const p of this.particles) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.02 // Slight gravity
      p.life -= 0.02
      p.size *= 0.995

      this.ctx.globalAlpha = p.life
      this.ctx.fillStyle = p.color
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      this.ctx.fill()

      // Glow effect
      this.ctx.globalAlpha = p.life * 0.3
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
      this.ctx.fill()
    }

    this.ctx.globalAlpha = 1

    // Limit particles
    if (this.particles.length > 300) {
      this.particles = this.particles.slice(-300)
    }
  }

  destroy(): void {
    this.stop()
    document.removeEventListener('mousemove', this.boundMouseMove)
    document.removeEventListener('mousedown', this.boundMouseDown)
    document.removeEventListener('mouseup', this.boundMouseUp)
    document.removeEventListener('keydown', this.boundKeyDown)
    this.ripples = []
    this.particles = []
  }
}
