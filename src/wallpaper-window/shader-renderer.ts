/**
 * Shader Renderer
 *
 * Renders WebGL GLSL fragment shaders as live wallpapers.
 * Includes built-in shader presets: aurora, particles, wave, nebula.
 */

export type ShaderPreset = 'aurora' | 'particles' | 'wave' | 'nebula' | 'custom'

const VERTEX_SHADER = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const SHADER_PRESETS: Record<string, string> = {
  aurora: `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      float t = u_time * 0.3;

      // Aurora layers
      float aurora = 0.0;
      for (float i = 1.0; i < 5.0; i++) {
        float freq = i * 0.7;
        float amp = 1.0 / i;
        aurora += sin(uv.x * freq * 6.28 + t * i * 0.5) * amp;
        aurora += sin(uv.x * freq * 3.14 + t * i * 0.3 + 2.0) * amp * 0.5;
      }

      aurora = aurora * 0.3 + 0.5;
      float mask = smoothstep(0.3, 0.7, uv.y) * smoothstep(1.0, 0.6, uv.y);
      float auroraStrength = smoothstep(aurora - 0.1, aurora + 0.1, uv.y) * mask;

      vec3 color1 = vec3(0.1, 0.8, 0.4);  // Green
      vec3 color2 = vec3(0.2, 0.4, 0.9);  // Blue
      vec3 color3 = vec3(0.6, 0.2, 0.8);  // Purple

      float mix1 = sin(uv.x * 3.0 + t) * 0.5 + 0.5;
      vec3 aurora_color = mix(mix(color1, color2, mix1), color3, sin(t * 0.2) * 0.5 + 0.5);

      // Stars
      vec2 starUV = fract(uv * 50.0);
      float star = step(0.98, fract(sin(dot(floor(uv * 50.0), vec2(12.9898, 78.233))) * 43758.5453));
      star *= smoothstep(0.0, 0.3, uv.y);

      // Sky gradient
      vec3 sky = mix(vec3(0.02, 0.02, 0.05), vec3(0.05, 0.05, 0.15), uv.y);

      vec3 finalColor = sky + aurora_color * auroraStrength * 0.6 + vec3(star * 0.8);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,

  particles: `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec3 color = vec3(0.02, 0.02, 0.06);

      for (float i = 0.0; i < 30.0; i++) {
        vec2 pos = vec2(hash(vec2(i, 0.0)), hash(vec2(0.0, i)));
        pos.y = fract(pos.y + u_time * (0.02 + hash(vec2(i, i)) * 0.03));
        pos.x += sin(u_time * 0.5 + i) * 0.05;

        float dist = length(uv - pos);
        float size = 0.003 + hash(vec2(i * 3.0, i * 7.0)) * 0.004;
        float glow = size / dist;
        glow = pow(glow, 1.5);

        float hue = hash(vec2(i, i + 100.0));
        vec3 particleColor = mix(
          vec3(0.4, 0.3, 0.9),
          vec3(0.2, 0.7, 0.9),
          hue
        );

        color += particleColor * glow * 0.15;
      }

      // Mouse interaction glow
      vec2 mouseUV = u_mouse / u_resolution;
      float mouseDist = length(uv - mouseUV);
      color += vec3(0.3, 0.2, 0.5) * (0.02 / (mouseDist + 0.1));

      gl_FragColor = vec4(color, 1.0);
    }
  `,

  wave: `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      float t = u_time * 0.5;

      vec3 color = vec3(0.03, 0.03, 0.08);

      for (float i = 1.0; i < 8.0; i++) {
        float freq = i * 0.5;
        float amp = 0.5 / i;
        float wave = sin(uv.x * freq * 6.28 + t * i * 0.3) * amp;
        wave += sin(uv.x * freq * 3.14 - t * i * 0.2 + i) * amp * 0.5;

        float waveLine = smoothstep(0.02, 0.0, abs(uv.y - 0.5 - wave * 0.3));

        float hue = i / 8.0;
        vec3 waveColor = mix(
          vec3(0.4, 0.2, 0.8),
          vec3(0.1, 0.6, 0.9),
          hue
        );

        color += waveColor * waveLine * 0.6;
        color += waveColor * smoothstep(0.1, 0.0, abs(uv.y - 0.5 - wave * 0.3)) * 0.05;
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `,

  nebula: `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;

    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float smoothNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = noise(i);
      float b = noise(i + vec2(1.0, 0.0));
      float c = noise(i + vec2(0.0, 1.0));
      float d = noise(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float val = 0.0;
      float amp = 0.5;
      for (int i = 0; i < 6; i++) {
        val += smoothNoise(p) * amp;
        p *= 2.0;
        amp *= 0.5;
      }
      return val;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      float t = u_time * 0.1;

      float n1 = fbm(uv * 3.0 + t);
      float n2 = fbm(uv * 5.0 - t * 0.5 + 10.0);
      float n3 = fbm(uv * 2.0 + t * 0.3 + vec2(n1, n2));

      vec3 color1 = vec3(0.3, 0.1, 0.5);
      vec3 color2 = vec3(0.1, 0.3, 0.7);
      vec3 color3 = vec3(0.5, 0.1, 0.3);
      vec3 color4 = vec3(0.05, 0.1, 0.2);

      vec3 color = mix(color4, color1, n1);
      color = mix(color, color2, n2 * 0.5);
      color = mix(color, color3, n3 * 0.3);
      color *= 0.7;

      // Stars
      float star = step(0.98, noise(floor(uv * 80.0)));
      float twinkle = sin(u_time * 3.0 + noise(floor(uv * 80.0)) * 100.0) * 0.5 + 0.5;
      color += vec3(star * twinkle * 0.6);

      gl_FragColor = vec4(color, 1.0);
    }
  `
}

export class ShaderRenderer {
  private canvas: HTMLCanvasElement | null = null
  private gl: WebGLRenderingContext | null = null
  private program: WebGLProgram | null = null
  private animationId: number = 0
  private startTime: number = 0
  private mouseX: number = 0
  private mouseY: number = 0

  init(canvas: HTMLCanvasElement, preset: ShaderPreset = 'aurora', customShader?: string): boolean {
    this.canvas = canvas
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext

    if (!this.gl) {
      console.error('WebGL not supported')
      return false
    }

    const fragmentSource = preset === 'custom' && customShader
      ? customShader
      : SHADER_PRESETS[preset] || SHADER_PRESETS.aurora

    this.program = this.createProgram(VERTEX_SHADER, fragmentSource)
    if (!this.program) return false

    // Setup geometry (fullscreen quad)
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    const buffer = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW)

    const position = this.gl.getAttribLocation(this.program, 'position')
    this.gl.enableVertexAttribArray(position)
    this.gl.vertexAttribPointer(position, 2, this.gl.FLOAT, false, 0, 0)

    this.startTime = performance.now()

    // Mouse tracking
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX
      this.mouseY = canvas.height - e.clientY // Flip Y for GL
    })

    return true
  }

  private createProgram(vertexSrc: string, fragmentSrc: string): WebGLProgram | null {
    if (!this.gl) return null

    const vertexShader = this.compileShader(vertexSrc, this.gl.VERTEX_SHADER)
    const fragmentShader = this.compileShader(fragmentSrc, this.gl.FRAGMENT_SHADER)
    if (!vertexShader || !fragmentShader) return null

    const program = this.gl.createProgram()!
    this.gl.attachShader(program, vertexShader)
    this.gl.attachShader(program, fragmentShader)
    this.gl.linkProgram(program)

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program link error:', this.gl.getProgramInfoLog(program))
      return null
    }

    this.gl.useProgram(program)
    return program
  }

  private compileShader(source: string, type: number): WebGLShader | null {
    if (!this.gl) return null

    const shader = this.gl.createShader(type)!
    this.gl.shaderSource(shader, source)
    this.gl.compileShader(shader)

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader))
      this.gl.deleteShader(shader)
      return null
    }

    return shader
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

  private render = (): void => {
    this.animationId = requestAnimationFrame(this.render)

    if (!this.gl || !this.program || !this.canvas) return

    const time = (performance.now() - this.startTime) / 1000

    this.gl.uniform1f(
      this.gl.getUniformLocation(this.program, 'u_time'),
      time
    )
    this.gl.uniform2f(
      this.gl.getUniformLocation(this.program, 'u_resolution'),
      this.canvas.width,
      this.canvas.height
    )
    this.gl.uniform2f(
      this.gl.getUniformLocation(this.program, 'u_mouse'),
      this.mouseX,
      this.mouseY
    )

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
  }

  changePreset(preset: ShaderPreset, customShader?: string): boolean {
    this.stop()
    if (this.canvas) {
      return this.init(this.canvas, preset, customShader)
    }
    return false
  }

  destroy(): void {
    this.stop()
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program)
    }
    this.gl = null
    this.program = null
  }
}
