/**
 * Wallpaper Window Renderer
 * Handles rendering of video, image, GIF, and shader wallpapers
 * in the hidden desktop-level window.
 *
 * Fixes:
 * - Guards against window.api being undefined at startup
 * - Normalizes Windows file paths (C:\ → file:///C:/)
 * - Adds error recovery for failed media loads
 * - Memory cleanup on wallpaper switch
 */

declare global {
  interface Window {
    api?: {
      onLoadWallpaper: (callback: (event: any, data: WallpaperData) => void) => void
      onWallpaperControl: (callback: (event: any, action: string) => void) => void
    }
  }
}

interface WallpaperData {
  path: string
  width: number
  height: number
  type: 'video' | 'gif' | 'image' | 'web' | 'shader'
}

const container = document.getElementById('wallpaper-container')!

let currentElement: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | null = null
let currentAnimationId: number = 0

/**
 * Convert Windows path to a proper file:// URL
 *  C:\Users\foo\bar.mp4 → file:///C:/Users/foo/bar.mp4
 */
function pathToFileURL(filePath: string): string {
  // Remove any existing file:// prefix
  let cleaned = filePath.replace(/^file:\/\/\/?/, '')
  // Normalize backslashes to forward slashes
  cleaned = cleaned.replace(/\\/g, '/')
  // Ensure starts with /
  if (!cleaned.startsWith('/')) {
    cleaned = '/' + cleaned
  }
  return 'file://' + cleaned
}

function clearContainer(): void {
  // Cancel any running animation
  if (currentAnimationId) {
    cancelAnimationFrame(currentAnimationId)
    currentAnimationId = 0
  }

  while (container.firstChild) {
    const child = container.firstChild as HTMLElement
    if (child instanceof HTMLVideoElement) {
      child.pause()
      child.removeAttribute('src')
      child.load() // Release resources
    }
    container.removeChild(child)
  }
  currentElement = null
}

function showError(message: string): void {
  clearContainer()
  const errorDiv = document.createElement('div')
  errorDiv.style.cssText = `
    width: 100%; height: 100%; display: flex; align-items: center;
    justify-content: center; color: rgba(255,255,255,0.3);
    font-family: sans-serif; font-size: 14px; text-align: center;
    padding: 40px;
  `
  errorDiv.textContent = message
  container.appendChild(errorDiv)
}

function loadVideo(path: string): void {
  clearContainer()

  const video = document.createElement('video')
  video.src = pathToFileURL(path)
  video.autoplay = true
  video.loop = true
  video.muted = true
  video.playsInline = true
  video.setAttribute('playsinline', '')
  video.crossOrigin = 'anonymous'

  video.style.width = '100%'
  video.style.height = '100%'
  video.style.objectFit = 'cover'

  video.addEventListener('loadeddata', () => {
    video.play().catch((err) => {
      console.error('Video play failed:', err)
    })
  })

  video.addEventListener('error', () => {
    const errCode = video.error?.code
    const errMsg = video.error?.message || 'Unknown error'
    console.error(`Video error (code ${errCode}):`, errMsg)
    showError(`Failed to load video: ${path}\n${errMsg}`)
  })

  // Handle stall/hang
  let stallTimeout: ReturnType<typeof setTimeout> | null = null
  video.addEventListener('waiting', () => {
    stallTimeout = setTimeout(() => {
      console.warn('Video stalled, attempting recovery...')
      const currentTime = video.currentTime
      video.load()
      video.currentTime = currentTime
      video.play().catch(console.error)
    }, 10000) // 10s timeout
  })
  video.addEventListener('playing', () => {
    if (stallTimeout) {
      clearTimeout(stallTimeout)
      stallTimeout = null
    }
  })

  container.appendChild(video)
  currentElement = video
}

function loadImage(path: string): void {
  clearContainer()

  const img = document.createElement('img')
  img.src = pathToFileURL(path)
  img.style.width = '100%'
  img.style.height = '100%'
  img.style.objectFit = 'cover'

  img.addEventListener('error', () => {
    console.error('Image load failed:', path)
    showError(`Failed to load image: ${path}`)
  })

  container.appendChild(img)
  currentElement = img
}

function loadGif(path: string): void {
  loadImage(path) // GIFs are loaded as img elements
}

function loadShader(width: number, height: number): void {
  clearContainer()

  const canvas = document.createElement('canvas')
  canvas.width = width || window.innerWidth
  canvas.height = height || window.innerHeight

  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
  if (!gl) {
    showError('WebGL not supported on this system')
    return
  }

  const vertexShaderSource = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `

  const fragmentShaderSource = `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec3 col = 0.5 + 0.5 * cos(u_time + uv.xyx * 3.0 + vec3(0, 2, 4));
      col *= 0.3;
      gl_FragColor = vec4(col, 1.0);
    }
  `

  // Compile shaders with error checking
  function compileShader(source: string, type: number): WebGLShader | null {
    const shader = gl!.createShader(type)
    if (!shader) return null
    gl!.shaderSource(shader, source)
    gl!.compileShader(shader)
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl!.getShaderInfoLog(shader))
      gl!.deleteShader(shader)
      return null
    }
    return shader
  }

  const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER)
  const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER)

  if (!vertexShader || !fragmentShader) {
    showError('Failed to compile shaders')
    return
  }

  const program = gl.createProgram()!
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program))
    showError('Failed to link shader program')
    return
  }

  gl.useProgram(program)

  const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

  const position = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  const timeLocation = gl.getUniformLocation(program, 'u_time')
  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')

  function render(time: number): void {
    if (!gl) return
    gl.uniform1f(timeLocation, time * 0.001)
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    currentAnimationId = requestAnimationFrame(render)
  }

  currentAnimationId = requestAnimationFrame(render)

  container.appendChild(canvas)
  currentElement = canvas
}

// === IPC Setup (guard against undefined window.api) ===

function setupIPC(): void {
  if (!window.api) {
    console.warn('window.api is not available — wallpaper IPC disabled')
    return
  }

  // Listen for wallpaper load commands from main process
  window.api.onLoadWallpaper((_event, data: WallpaperData) => {
    console.log('Loading wallpaper:', data)

    switch (data.type) {
      case 'video':
        loadVideo(data.path)
        break
      case 'image':
        loadImage(data.path)
        break
      case 'gif':
        loadGif(data.path)
        break
      case 'shader':
        loadShader(data.width, data.height)
        break
      default:
        loadVideo(data.path)
    }
  })

  // Listen for play/pause controls
  window.api.onWallpaperControl((_event, action: string) => {
    if (currentElement instanceof HTMLVideoElement) {
      if (action === 'pause') {
        currentElement.pause()
      } else if (action === 'play') {
        currentElement.play().catch(console.error)
      } else if (action === 'mute') {
        currentElement.muted = true
      } else if (action === 'unmute') {
        currentElement.muted = false
      }
    }
  })
}

// Initialize when DOM is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setupIPC()
} else {
  document.addEventListener('DOMContentLoaded', setupIPC)
}
