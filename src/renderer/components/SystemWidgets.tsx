import { useState, useEffect, useRef } from 'react'

const appStartTime = Date.now()

interface SystemData {
  cpu: number
  ram: { used: number; total: number; percent: number }
  uptime: string
  time: string
  date: string
  cpuModel: string
  cpuCores: number
  hostname: string
}

function SystemWidgets(): JSX.Element {
  const [data, setData] = useState<SystemData>({
    cpu: 0,
    ram: { used: 0, total: 0, percent: 0 },
    uptime: '0h 0m',
    time: '',
    date: '',
    cpuModel: 'Loading...',
    cpuCores: 0,
    hostname: ''
  })
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(30).fill(0))
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const updateData = async (): Promise<void> => {
      const now = new Date()
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

      try {
        // Real system stats via IPC
        const stats = await (window as any).api.getSystemStats()
        setData({
          cpu: stats.cpu,
          ram: {
            used: stats.ram.used,
            total: stats.ram.total,
            percent: stats.ram.percent
          },
          uptime: formatUptime(Math.floor((Date.now() - appStartTime) / 1000)),
          time: timeStr,
          date: dateStr,
          cpuModel: stats.cpuModel || 'Unknown CPU',
          cpuCores: stats.cpuCores || 0,
          hostname: stats.hostname || ''
        })
        setCpuHistory(prev => [...prev.slice(-29), stats.cpu])
      } catch {
        // Fallback if IPC fails
        setData(prev => ({ ...prev, time: timeStr, date: dateStr }))
      }
    }

    updateData()
    const interval = setInterval(updateData, 2000)
    return () => clearInterval(interval)
  }, [])

  // Draw CPU graph
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.moveTo(0, (height / 4) * i)
      ctx.lineTo(width, (height / 4) * i)
      ctx.stroke()
    }

    // Fill
    const grad = ctx.createLinearGradient(0, 0, 0, height)
    grad.addColorStop(0, 'rgba(108,92,231,0.55)')
    grad.addColorStop(1, 'rgba(108,92,231,0)')
    ctx.beginPath()
    cpuHistory.forEach((v, i) => {
      const x = (i / (cpuHistory.length - 1)) * width
      const y = height - (v / 100) * height
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.fillStyle = grad
    ctx.fill()

    // Stroke
    ctx.beginPath()
    cpuHistory.forEach((v, i) => {
      const x = (i / (cpuHistory.length - 1)) * width
      const y = height - (v / 100) * height
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = '#a29bfe'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [cpuHistory])

  const formatUptime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`
  }

  const CircularGauge = ({ value, label, color, sub }: {
    value: number; label: string; color: string; sub?: string
  }): JSX.Element => {
    const r = 36
    const stroke = 5
    const circ = 2 * Math.PI * r
    const offset = circ - (Math.min(100, value) / 100) * circ
    return (
      <div style={{ textAlign: 'center' }}>
        <svg width={90} height={90} viewBox="0 0 90 90">
          <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
          <circle
            cx="45" cy="45" r={r}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 45 45)"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
          <text x="45" y="40" textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontWeight="700" fontFamily="Outfit">
            {value.toFixed(0)}%
          </text>
          <text x="45" y="56" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="Outfit">
            {label}
          </text>
        </svg>
        {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
      </div>
    )
  }

  const ramGB = (mb: number): string => (mb / 1024).toFixed(1) + ' GB'

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">System Monitor</h1>
          <p className="page-header__subtitle">Real-time system performance — {data.hostname}</p>
        </div>
        <span style={{
          fontSize: '0.75rem', padding: '3px 10px', borderRadius: '10px',
          background: 'rgba(0,206,180,0.12)', color: 'rgba(0,206,180,0.85)',
          border: '1px solid rgba(0,206,180,0.2)'
        }}>● Live</span>
      </div>

      {/* Clock */}
      <div className="settings__group" style={{ textAlign: 'center', padding: '28px' }}>
        <div style={{
          fontSize: '2.8rem', fontWeight: 800, letterSpacing: '-2px',
          background: 'var(--accent-gradient)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>{data.time}</div>
        <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>{data.date}</div>
      </div>

      {/* Gauges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
        <div className="settings__group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px' }}>
          <CircularGauge value={data.cpu} label="CPU" color="#6c5ce7" />
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
            {data.cpuCores} cores
          </div>
        </div>
        <div className="settings__group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px' }}>
          <CircularGauge value={data.ram.percent} label="RAM" color="#00cec9"
            sub={`${ramGB(data.ram.used)} / ${ramGB(data.ram.total)}`} />
        </div>
        <div className="settings__group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px' }}>
          <CircularGauge value={0} label="GPU" color="#fdcb6e" />
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>N/A</div>
        </div>
      </div>

      {/* CPU Graph */}
      <div className="settings__group">
        <div className="settings__group-title">📈 CPU History</div>
        <div style={{ background: 'rgba(5,5,10,0.5)', borderRadius: '12px', padding: '12px', marginTop: '8px' }}>
          <canvas ref={canvasRef} width={600} height={100} style={{ width: '100%', height: '100px' }} />
        </div>
      </div>

      {/* Info */}
      <div className="settings__group">
        <div className="settings__group-title">ℹ️ System Info</div>
        {[
          { label: 'CPU', value: data.cpuModel },
          { label: 'Cores', value: `${data.cpuCores} logical cores` },
          { label: 'RAM Total', value: ramGB(data.ram.total) },
          { label: 'RAM Used', value: ramGB(data.ram.used) },
          { label: 'Platform', value: '🪟 Windows' },
          { label: 'Uptime (app)', value: `⏱ ${data.uptime}` }
        ].map(({ label, value }) => (
          <div key={label} className="settings__row">
            <div className="settings__label">{label}</div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'right', maxWidth: '55%' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SystemWidgets
