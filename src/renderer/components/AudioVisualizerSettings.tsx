import { useState, useEffect, useRef, useCallback } from 'react'

type VisualizerStyle = 'bars' | 'wave' | 'circular' | 'mirror'

interface VisualizerConfig {
  style: VisualizerStyle
  barCount: number
  smoothing: number
  sensitivity: number
  colorStart: string
  colorEnd: string
  opacity: number
  showPeaks: boolean
}

const STYLE_INFO: Record<VisualizerStyle, { icon: string; label: string; desc: string }> = {
  bars:     { icon: '📊', label: 'Bars',     desc: 'Classic frequency bars' },
  wave:     { icon: '🌊', label: 'Wave',     desc: 'Smooth waveform line' },
  circular: { icon: '🔮', label: 'Circular', desc: 'Radial spectrum ring' },
  mirror:   { icon: '🪞', label: 'Mirror',   desc: 'Symmetric reflection' }
}

const COLOR_PRESETS = [
  { name: 'Galaxy',    start: '#6c5ce7', end: '#a29bfe' },
  { name: 'Ocean',     start: '#0984e3', end: '#74b9ff' },
  { name: 'Sunset',    start: '#e17055', end: '#fdcb6e' },
  { name: 'Emerald',   start: '#00b894', end: '#55efc4' },
  { name: 'Neon Pink', start: '#e84393', end: '#fd79a8' },
  { name: 'Cyber',     start: '#00cec9', end: '#81ecec' }
]

function AudioVisualizerSettings(): JSX.Element {
  const [config, setConfig] = useState<VisualizerConfig>({
    style: 'bars', barCount: 64, smoothing: 0.82, sensitivity: 1.4,
    colorStart: '#6c5ce7', colorEnd: '#a29bfe', opacity: 0.9, showPeaks: true
  })
  const [isListening, setIsListening] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [permission, setPermission] = useState<'idle' | 'granted' | 'denied'>('idle')
  const [error, setError] = useState('')

  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const analyserRef   = useRef<AnalyserNode | null>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const animFrameRef  = useRef<number>(0)
  const ctxRef        = useRef<AudioContext | null>(null)
  const peaksRef      = useRef<Float32Array | null>(null)
  const peakTimerRef  = useRef<number[]>([])
  const configRef     = useRef(config)

  useEffect(() => { configRef.current = config }, [config])

  const updateConfig = (key: keyof VisualizerConfig, value: unknown): void =>
    setConfig(prev => ({ ...prev, [key]: value }))

  // ── Start microphone ──
  const startListening = useCallback(async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream

      const audioCtx = new AudioContext()
      ctxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = config.smoothing
      source.connect(analyser)
      analyserRef.current = analyser

      peaksRef.current = new Float32Array(analyser.frequencyBinCount).fill(0)
      peakTimerRef.current = new Array(analyser.frequencyBinCount).fill(0)

      setIsListening(true)
      setPermission('granted')
    } catch (e: any) {
      setPermission('denied')
      setError(e.message || 'Microphone access denied')
    }
  }, [config.smoothing])

  const stopListening = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    ctxRef.current?.close()
    analyserRef.current = null
    streamRef.current = null
    ctxRef.current = null
    setIsListening(false)
    setAudioLevel(0)
    // Clear canvas
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  // Update smoothing when config changes
  useEffect(() => {
    if (analyserRef.current) {
      analyserRef.current.smoothingTimeConstant = config.smoothing
    }
  }, [config.smoothing])

  // ── Animation loop ──
  useEffect(() => {
    if (!isListening) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const draw = (): void => {
      animFrameRef.current = requestAnimationFrame(draw)
      const analyser = analyserRef.current
      if (!analyser) return
      const cfg = configRef.current

      const bufLen = analyser.frequencyBinCount
      const dataArr = new Uint8Array(bufLen)
      analyser.getByteFrequencyData(dataArr)

      // Average level for meter
      const avg = dataArr.reduce((s, v) => s + v, 0) / bufLen
      setAudioLevel(Math.round((avg / 255) * 100))

      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      // Background
      ctx.fillStyle = 'rgba(3,2,10,0.95)'
      ctx.fillRect(0, 0, W, H)

      // Gradient
      const grad = ctx.createLinearGradient(0, H, 0, 0)
      grad.addColorStop(0, cfg.colorStart + 'ee')
      grad.addColorStop(1, cfg.colorEnd + 'bb')

      const sens = cfg.sensitivity

      if (cfg.style === 'bars' || cfg.style === 'mirror') {
        const count = Math.min(cfg.barCount, bufLen)
        const barW = (W / count) - 1
        const isMirror = cfg.style === 'mirror'

        for (let i = 0; i < count; i++) {
          const idx = Math.floor((i / count) * bufLen * 0.75) // Focus on audible range
          const val = Math.min(255, dataArr[idx] * sens) / 255
          const barH = val * (isMirror ? H / 2 : H) * cfg.opacity

          const x = i * (barW + 1)
          const g2 = ctx.createLinearGradient(x, H, x, H - barH)
          g2.addColorStop(0, cfg.colorStart)
          g2.addColorStop(1, cfg.colorEnd)
          ctx.fillStyle = g2

          if (isMirror) {
            ctx.fillRect(x, H / 2 - barH, barW, barH)
            ctx.fillRect(x, H / 2, barW, barH)
          } else {
            ctx.fillRect(x, H - barH, barW, barH)
          }

          // Peak dots
          if (cfg.showPeaks && peaksRef.current) {
            if (val > peaksRef.current[i]) {
              peaksRef.current[i] = val
              peakTimerRef.current[i] = 60
            } else if (peakTimerRef.current[i] > 0) {
              peakTimerRef.current[i]--
            } else {
              peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 0.008)
            }
            const py = isMirror
              ? H / 2 - peaksRef.current[i] * H / 2
              : H - peaksRef.current[i] * H
            ctx.fillStyle = cfg.colorEnd
            ctx.fillRect(x, py - 2, barW, 2)
          }
        }
      } else if (cfg.style === 'wave') {
        const waveArr = new Uint8Array(bufLen)
        analyser.getByteTimeDomainData(waveArr)

        ctx.beginPath()
        ctx.lineWidth = 2.5
        ctx.strokeStyle = cfg.colorStart
        const sliceW = W / bufLen
        let x = 0
        for (let i = 0; i < bufLen; i++) {
          const v = (waveArr[i] / 128.0) * sens
          const y = (v * H) / 2
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
          x += sliceW
        }
        ctx.stroke()

        // Glow
        ctx.shadowBlur = 20
        ctx.shadowColor = cfg.colorEnd
        ctx.stroke()
        ctx.shadowBlur = 0
      } else if (cfg.style === 'circular') {
        const cx = W / 2, cy = H / 2
        const radius = Math.min(W, H) * 0.28
        const count = Math.min(cfg.barCount * 2, bufLen)

        for (let i = 0; i < count; i++) {
          const idx = Math.floor((i / count) * bufLen * 0.75)
          const val = Math.min(255, dataArr[idx] * sens) / 255
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2
          const len = val * radius * 0.7 * cfg.opacity

          const x1 = cx + Math.cos(angle) * radius
          const y1 = cy + Math.sin(angle) * radius
          const x2 = cx + Math.cos(angle) * (radius + len)
          const y2 = cy + Math.sin(angle) * (radius + len)

          // Color by position
          const t = i / count
          const r1 = parseInt(cfg.colorStart.slice(1, 3), 16)
          const g1 = parseInt(cfg.colorStart.slice(3, 5), 16)
          const b1 = parseInt(cfg.colorStart.slice(5, 7), 16)
          const r2 = parseInt(cfg.colorEnd.slice(1, 3), 16)
          const g2i = parseInt(cfg.colorEnd.slice(3, 5), 16)
          const b2 = parseInt(cfg.colorEnd.slice(5, 7), 16)
          const rr = Math.round(r1 + (r2 - r1) * t)
          const gg = Math.round(g1 + (g2i - g1) * t)
          const bb = Math.round(b1 + (b2 - b1) * t)

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.strokeStyle = `rgba(${rr},${gg},${bb},${cfg.opacity})`
          ctx.lineWidth = 2.5
          ctx.stroke()
        }
        // Center circle
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.strokeStyle = `${cfg.colorStart}44`
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    draw()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isListening])

  // Cleanup on unmount
  useEffect(() => () => stopListening(), [stopListening])

  const selectedPreset = COLOR_PRESETS.find(p => p.start === config.colorStart) || null

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Audio Visualizer</h1>
          <p className="page-header__subtitle">Visualizer âm thanh real-time từ microphone</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isListening && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#00ffcc', boxShadow: '0 0 8px #00ffcc',
                animation: 'pulse 1s ease-in-out infinite'
              }} />
              <span style={{ fontSize: '0.78rem', color: 'rgba(0,255,200,0.85)' }}>Live</span>
            </div>
          )}
          <button
            className={`btn ${isListening ? 'btn--secondary' : 'btn--primary'}`}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? '⏹ Stop' : '🎤 Start Listening'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: '10px', marginBottom: '10px',
          background: 'rgba(214,48,49,0.1)', border: '1px solid rgba(214,48,49,0.25)',
          color: 'rgba(255,120,120,0.9)', fontSize: '0.82rem'
        }}>⚠️ {error}</div>
      )}

      {/* Permission prompt */}
      {permission === 'idle' && (
        <div style={{
          padding: '14px 18px', borderRadius: '12px', marginBottom: '12px',
          background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.18)',
          fontSize: '0.82rem', color: 'rgba(200,180,255,0.8)', lineHeight: 1.6
        }}>
          🎤 <strong>Nhấn "Start Listening"</strong> để bắt đầu capture âm thanh từ microphone.
          Trình duyệt sẽ yêu cầu quyền truy cập microphone. <br />
          <span style={{ color: 'rgba(160,140,255,0.6)', fontSize: '0.75rem' }}>
            Lưu ý: Hiện tại chỉ hỗ trợ microphone. Desktop audio loopback cần driver WASAPI riêng.
          </span>
        </div>
      )}

      {/* Audio level meter */}
      {isListening && (
        <div className="settings__group" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              Audio Level
            </span>
            <div style={{
              flex: 1, height: '6px', borderRadius: '3px',
              background: 'rgba(255,255,255,0.06)', overflow: 'hidden'
            }}>
              <div style={{
                height: '100%', borderRadius: '3px',
                width: `${audioLevel}%`,
                background: `linear-gradient(90deg, ${config.colorStart}, ${config.colorEnd})`,
                transition: 'width 0.05s ease',
                boxShadow: `0 0 8px ${config.colorEnd}88`
              }} />
            </div>
            <span style={{
              fontSize: '0.75rem', fontFamily: 'monospace',
              color: 'var(--text-muted)', minWidth: '32px'
            }}>{audioLevel}%</span>
          </div>
        </div>
      )}

      {/* Canvas visualizer */}
      <div className="settings__group" style={{ padding: '8px' }}>
        <div style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            width={800}
            height={180}
            style={{
              width: '100%', height: '180px',
              borderRadius: '12px',
              display: 'block'
            }}
          />
          {!isListening && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(3,2,10,0.85)', borderRadius: '12px',
              flexDirection: 'column', gap: '8px'
            }}>
              <div style={{ fontSize: '2rem' }}>🎤</div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                Nhấn Start Listening để xem visualizer
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Style selector */}
      <div className="settings__group">
        <div className="settings__group-title">🎨 Style</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', margin: '8px 0' }}>
          {(Object.entries(STYLE_INFO) as [VisualizerStyle, typeof STYLE_INFO['bars']][]).map(([key, info]) => (
            <div
              key={key}
              onClick={() => updateConfig('style', key)}
              style={{
                padding: '14px 10px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer',
                border: `2px solid ${config.style === key ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: config.style === key ? 'rgba(108,92,231,0.12)' : 'var(--bg-tertiary)',
                transition: 'all 0.18s ease'
              }}
            >
              <div style={{ fontSize: '1.4rem', marginBottom: '5px' }}>{info.icon}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{info.label}</div>
              <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: '2px' }}>{info.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="settings__group">
        <div className="settings__group-title">🌈 Colors</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '7px', margin: '8px 0' }}>
          {COLOR_PRESETS.map(preset => (
            <div
              key={preset.name}
              onClick={() => { updateConfig('colorStart', preset.start); updateConfig('colorEnd', preset.end) }}
              style={{
                padding: '9px 12px', borderRadius: '10px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '9px',
                border: `2px solid ${selectedPreset?.name === preset.name ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: 'var(--bg-tertiary)', transition: 'all 0.18s ease'
              }}
            >
              <div style={{
                width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
                background: `linear-gradient(135deg, ${preset.start}, ${preset.end})`
              }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>{preset.name}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <div className="settings__row" style={{ flex: 1 }}>
            <div className="settings__label">Start</div>
            <input type="color" value={config.colorStart}
              onChange={e => updateConfig('colorStart', e.target.value)}
              style={{ width: '36px', height: '28px', border: 'none', cursor: 'pointer', borderRadius: '6px' }} />
          </div>
          <div className="settings__row" style={{ flex: 1 }}>
            <div className="settings__label">End</div>
            <input type="color" value={config.colorEnd}
              onChange={e => updateConfig('colorEnd', e.target.value)}
              style={{ width: '36px', height: '28px', border: 'none', cursor: 'pointer', borderRadius: '6px' }} />
          </div>
        </div>
      </div>

      {/* Parameters */}
      <div className="settings__group">
        <div className="settings__group-title">⚙️ Parameters</div>
        {[
          { key: 'barCount',    label: 'Bar Count',    min: 16, max: 128, step: 8,    val: config.barCount,    fmt: (v:number) => String(v),           toNum: (v:string) => parseInt(v) },
          { key: 'smoothing',   label: 'Smoothing',    min: 0,  max: 0.95, step: 0.05, val: config.smoothing,  fmt: (v:number) => `${(v*100).toFixed(0)}%`, toNum: (v:string) => parseFloat(v) },
          { key: 'sensitivity', label: 'Sensitivity',  min: 0.5, max: 4.0, step: 0.1, val: config.sensitivity, fmt: (v:number) => `${v.toFixed(1)}x`,   toNum: (v:string) => parseFloat(v) },
          { key: 'opacity',     label: 'Opacity',      min: 0.2, max: 1.0, step: 0.1, val: config.opacity,     fmt: (v:number) => `${(v*100).toFixed(0)}%`, toNum: (v:string) => parseFloat(v) }
        ].map(p => (
          <div key={p.key} className="settings__row">
            <div className="settings__label">{p.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="range" className="range-slider"
                min={p.min} max={p.max} step={p.step}
                value={p.val as number}
                onChange={e => updateConfig(p.key as keyof VisualizerConfig, p.toNum(e.target.value))}
              />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', minWidth: '38px' }}>
                {p.fmt(p.val as number)}
              </span>
            </div>
          </div>
        ))}
        <div className="settings__row">
          <div>
            <div className="settings__label">Show Peaks</div>
            <div className="settings__description">Peak hold dots above bars</div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={config.showPeaks}
              onChange={e => updateConfig('showPeaks', e.target.checked)} />
            <span className="toggle__slider" />
          </label>
        </div>
      </div>
    </div>
  )
}

export default AudioVisualizerSettings
