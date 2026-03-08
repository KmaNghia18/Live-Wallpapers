import { useState, useEffect } from 'react'

interface Monitor {
  id: number
  label: string
  bounds: { x: number; y: number; width: number; height: number }
  size: { width: number; height: number }
  scaleFactor: number
  isPrimary: boolean
  resolution: string
  refreshRate: number
}

function MonitorInfo(): JSX.Element {
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [selectedMonitor, setSelectedMonitor] = useState<number | null>(null)

  useEffect(() => {
    window.api.getMonitors().then(setMonitors)
  }, [])

  const selected = monitors.find(m => m.id === selectedMonitor)

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Monitors</h1>
          <p className="page-header__subtitle">
            {monitors.length} monitor{monitors.length !== 1 ? 's' : ''} detected
          </p>
        </div>
      </div>

      {/* Visual Monitor Layout */}
      <div className="monitor-layout">
        {monitors.map((monitor) => (
          <div
            key={monitor.id}
            className={`monitor-box ${selectedMonitor === monitor.id ? 'monitor-box--active' : ''}`}
            onClick={() => setSelectedMonitor(monitor.id)}
            style={{
              width: `${Math.max(120, monitor.size.width / 15)}px`,
              height: `${Math.max(70, monitor.size.height / 15)}px`
            }}
          >
            <div className="monitor-box__label">{monitor.label}</div>
            <div className="monitor-box__resolution">
              {monitor.size.width} × {monitor.size.height}
            </div>
            {monitor.isPrimary && (
              <div className="monitor-box__badge">Primary</div>
            )}
          </div>
        ))}
      </div>

      {/* Monitor Details */}
      {selected && (
        <div className="settings__group" style={{ marginTop: '20px' }}>
          <div className="settings__group-title">
            📊 {selected.label} — Details
          </div>
          <div className="settings__row">
            <div className="settings__label">Resolution</div>
            <span style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>
              {selected.size.width} × {selected.size.height} ({selected.resolution})
            </span>
          </div>
          <div className="settings__row">
            <div className="settings__label">Scale Factor</div>
            <span style={{ color: 'var(--text-secondary)' }}>{selected.scaleFactor * 100}%</span>
          </div>
          <div className="settings__row">
            <div className="settings__label">Refresh Rate</div>
            <span style={{ color: 'var(--text-secondary)' }}>{selected.refreshRate} Hz</span>
          </div>
          <div className="settings__row">
            <div className="settings__label">Position</div>
            <span style={{ color: 'var(--text-secondary)' }}>
              X: {selected.bounds.x}, Y: {selected.bounds.y}
            </span>
          </div>
          <div className="settings__row">
            <div className="settings__label">Recommended Quality</div>
            <span style={{
              padding: '4px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: selected.resolution === '4K'
                ? 'rgba(108, 92, 231, 0.2)' : selected.resolution === '2K'
                ? 'rgba(0, 206, 201, 0.2)' : 'rgba(253, 203, 110, 0.2)',
              color: selected.resolution === '4K'
                ? '#a29bfe' : selected.resolution === '2K'
                ? '#00cec9' : '#fdcb6e'
            }}>
              {selected.resolution === '4K' ? '3840×2160 @ 30fps'
                : selected.resolution === '2K' ? '2560×1440 @ 30fps'
                : '1920×1080 @ 30fps'}
            </span>
          </div>
        </div>
      )}

      {monitors.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">🖥</div>
          <div className="empty-state__title">Detecting monitors...</div>
          <div className="empty-state__description">
            Please wait while we detect your display configuration.
          </div>
        </div>
      )}
    </div>
  )
}

export default MonitorInfo
