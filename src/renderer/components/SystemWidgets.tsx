import { useState, useEffect, useRef } from 'react'

const appStartTime = Date.now()

interface SystemData {
  cpu: number
  ram: { used: number; total: number; percent: number }
  uptime: string
  time: string
  date: string
}

function SystemWidgets(): JSX.Element {
  const [data, setData] = useState<SystemData>({
    cpu: 0,
    ram: { used: 0, total: 0, percent: 0 },
    uptime: '0h 0m',
    time: '',
    date: ''
  })
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(30).fill(0))
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const updateData = (): void => {
      const now = new Date()

      // Simulate system data (in production, use IPC to get from main process)
      const cpuUsage = Math.random() * 40 + 10
      const totalRam = 16384 // 16GB
      const usedRam = Math.random() * 6000 + 4000

      setData({
        cpu: cpuUsage,
        ram: {
          used: usedRam,
          total: totalRam,
          percent: (usedRam / totalRam) * 100
        },
        uptime: formatUptime(Math.floor((Date.now() - appStartTime) / 1000)),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      })

      setCpuHistory(prev => [...prev.slice(-29), cpuUsage])
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

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    for (let i = 0; i < 4; i++) {
      const y = (height / 4) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // CPU line
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, 'rgba(108, 92, 231, 0.6)')
    gradient.addColorStop(1, 'rgba(108, 92, 231, 0)')

    ctx.beginPath()
    ctx.moveTo(0, height)

    cpuHistory.forEach((value, i) => {
      const x = (i / (cpuHistory.length - 1)) * width
      const y = height - (value / 100) * height
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })

    ctx.lineTo(width, height)
    ctx.fillStyle = gradient
    ctx.fill()

    // Line stroke
    ctx.beginPath()
    cpuHistory.forEach((value, i) => {
      const x = (i / (cpuHistory.length - 1)) * width
      const y = height - (value / 100) * height
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = '#6c5ce7'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [cpuHistory])

  const formatUptime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${m}m`
  }

  const CircularGauge = ({ value, label, color, icon }: {
    value: number; label: string; color: string; icon: string
  }): JSX.Element => {
    const radius = 36
    const stroke = 5
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (value / 100) * circumference

    return (
      <div style={{ textAlign: 'center' }}>
        <svg width={90} height={90} viewBox="0 0 90 90">
          <circle
            cx="45" cy="45" r={radius}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke}
          />
          <circle
            cx="45" cy="45" r={radius}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 45 45)"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
          <text x="45" y="40" textAnchor="middle" fill="var(--text-primary)"
            fontSize="14" fontWeight="700" fontFamily="Inter">
            {value.toFixed(0)}%
          </text>
          <text x="45" y="56" textAnchor="middle" fill="var(--text-muted)"
            fontSize="10" fontFamily="Inter">
            {icon}
          </text>
        </svg>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {label}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">System Monitor</h1>
          <p className="page-header__subtitle">Real-time system performance overview</p>
        </div>
      </div>

      {/* Clock */}
      <div className="settings__group" style={{ textAlign: 'center', padding: '30px' }}>
        <div style={{
          fontSize: '3rem', fontWeight: 800, letterSpacing: '-2px',
          background: 'var(--accent-gradient)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          {data.time}
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          {data.date}
        </div>
      </div>

      {/* Gauges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <div className="settings__group" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px'
        }}>
          <CircularGauge value={data.cpu} label="CPU Usage" color="#6c5ce7" icon="🖥" />
        </div>
        <div className="settings__group" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px'
        }}>
          <CircularGauge value={data.ram.percent} label="RAM Usage" color="#00cec9" icon="💾" />
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            {(data.ram.used / 1024).toFixed(1)} / {(data.ram.total / 1024).toFixed(0)} GB
          </div>
        </div>
        <div className="settings__group" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px'
        }}>
          <CircularGauge value={Math.random() * 20 + 5} label="GPU Usage" color="#fdcb6e" icon="🎮" />
        </div>
      </div>

      {/* CPU History Graph */}
      <div className="settings__group">
        <div className="settings__group-title">📈 CPU History (60s)</div>
        <div style={{
          background: 'rgba(5,5,10,0.5)', borderRadius: '12px', padding: '12px', marginTop: '8px'
        }}>
          <canvas
            ref={canvasRef}
            width={600}
            height={120}
            style={{ width: '100%', height: '120px' }}
          />
        </div>
      </div>

      {/* System Info */}
      <div className="settings__group">
        <div className="settings__group-title">ℹ️ System Information</div>
        <div className="settings__row">
          <div className="settings__label">Uptime</div>
          <span style={{ color: 'var(--text-secondary)' }}>⏱ {data.uptime}</span>
        </div>
        <div className="settings__row">
          <div className="settings__label">Platform</div>
          <span style={{ color: 'var(--text-secondary)' }}>🖥 Windows</span>
        </div>
        <div className="settings__row">
          <div className="settings__label">Wallpaper Status</div>
          <span style={{
            padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem',
            background: 'rgba(0,206,201,0.15)', color: '#00cec9'
          }}>
            ● Active
          </span>
        </div>
      </div>
    </div>
  )
}

export default SystemWidgets
