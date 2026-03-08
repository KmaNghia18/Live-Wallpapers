/**
 * Wallpaper Window Renderer
 * Handles rendering of video, image, GIF, and shader wallpapers
 * in the hidden desktop-level window.
 */

declare global {
  interface Window {
    api: {
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

function clearContainer(): void {
  while (container.firstChild) {
    const child = container.firstChild as HTMLElement
    if (child instanceof HTMLVideoElement) {
      child.pause()
      child.src = ''
      child.load()
    }
    container.removeChild(child)
  }
  currentElement = null
}

function loadVideo(path: string): void {
  clearContainer()

  const video = document.createElement('video')
  video.src = `file://${path}`
  video.autoplay = true
  video.loop = true
  video.muted = true
  video.playsInline = true
  video.setAttribute('playsinline', '')

  video.style.width = '100%'
  video.style.height = '100%'
  video.style.objectFit = 'cover'

  video.addEventListener('loadeddata', () => {
    video.play().catch(console.error)
  })

  video.addEventListener('error', (e) => {
    console.error('Video error:', e)
  })

  container.appendChild(video)
  currentElement = video
}

function loadImage(path: string): void {
  clearContainer()

  const img = document.createElement('img')
  img.src = `file://${path}`
  img.style.width = '100%'
  img.style.height = '100%'
  img.style.objectFit = 'cover'

  container.appendChild(img)
  currentElement = img
}

function loadGif(path: string): void {
  loadImage(path) // GIFs are loaded as images
}

function loadShader(width: number, height: number): void {
  clearContainer()

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
  if (!gl) {
    console.error('WebGL not supported')
    return
  }

  // Simple gradient shader as default
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
      col *= 0.3; // Darken for desktop
      gl_FragColor = vec4(col, 1.0);
    }
  `

  const vertexShader = gl.createShader(gl.VERTEX_SHADER)!
  gl.shaderSource(vertexShader, vertexShaderSource)
  gl.compileShader(vertexShader)

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!
  gl.shaderSource(fragmentShader, fragmentShaderSource)
  gl.compileShader(fragmentShader)

  const program = gl.createProgram()!
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
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

  let animationId: number

  function render(time: number): void {
    gl!.uniform1f(timeLocation, time * 0.001)
    gl!.uniform2f(resolutionLocation, width, height)
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
    animationId = requestAnimationFrame(render)
  }

  animationId = requestAnimationFrame(render)

  container.appendChild(canvas)
  currentElement = canvas
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
    }
  }
})
