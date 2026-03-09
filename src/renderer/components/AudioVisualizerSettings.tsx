import { useState } from 'react'

type VisualizerStyle = 'bars' | 'wave' | 'circular' | 'particles'

interface AudioVisualizerSettingsProps {
  onApply?: (config: VisualizerConfig) => void
}

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

const STYLE_INFO: Record<VisualizerStyle, { icon: string; label: string; desc: string }> = {
  bars: { icon: '📊', label: 'Bars', desc: 'Classic frequency bars' },
  wave: { icon: '🌊', label: 'Wave', desc: 'Smooth waveform display' },
  circular: { icon: '🔮', label: 'Circular', desc: 'Circular spectrum analyzer' },
  particles: { icon: '✨', label: 'Particles', desc: 'Beat-reactive particle burst' }
}

const COLOR_PRESETS = [
  { name: 'Purple Dream', start: '#6c5ce7', end: '#a29bfe' },
  { name: 'Ocean Blue', start: '#0984e3', end: '#74b9ff' },
  { name: 'Sunset', start: '#e17055', end: '#fdcb6e' },
  { name: 'Emerald', start: '#00b894', end: '#55efc4' },
  { name: 'Neon Pink', start: '#e84393', end: '#fd79a8' },
  { name: 'Cyber', start: '#00cec9', end: '#81ecec' }
]

function AudioVisualizerSettings({ onApply }: AudioVisualizerSettingsProps): JSX.Element {
  const [config, setConfig] = useState<VisualizerConfig>({
    style: 'bars',
    barCount: 64,
    smoothing: 0.8,
    sensitivity: 1.0,
    colorStart: '#6c5ce7',
    colorEnd: '#a29bfe',
    opacity: 0.8,
    mirror: true
  })

  const updateConfig = (key: keyof VisualizerConfig, value: unknown): void => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Audio Visualizer</h1>
          <p className="page-header__subtitle">Customize music-reactive wallpaper effects</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '0.72rem', padding: '3px 10px', borderRadius: '10px',
            background: 'rgba(253,203,110,0.12)', color: 'rgba(253,203,110,0.85)',
            border: '1px solid rgba(253,203,110,0.2)'
          }}>⚠ Preview Only</span>
          <button className="btn btn--primary" onClick={() => onApply?.(config)}>
            🎵 Apply
          </button>
        </div>
      </div>

      {/* Notice */}
      <div style={{
        padding: '12px 16px', borderRadius: '12px', marginBottom: '8px',
        background: 'rgba(253,203,110,0.06)',
        border: '1px solid rgba(253,203,110,0.15)',
        fontSize: '0.8rem', color: 'rgba(253,203,110,0.75)',
        lineHeight: 1.5
      }}>
        <strong>ℹ️ Lưu ý:</strong> Tính năng này hiển thị preview UI của visualizer.
        Để kết nối với audio thật, cần quyền truy cập microphone hoặc audio loopback từ hệ thống.
        Config sẽ được lưu và áp dụng khi có wallpaper hỗ trợ audio visualizer.
      </div>

      {/* Style Selection */}
      <div className="settings__group">
        <div className="settings__group-title">🎨 Visualization Style</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', margin: '8px 0'
        }}>
          {(Object.entries(STYLE_INFO) as [VisualizerStyle, typeof STYLE_INFO['bars']][]).map(
            ([key, info]) => (
              <div
                key={key}
                onClick={() => updateConfig('style', key)}
                style={{
                  padding: '16px 12px',
                  borderRadius: '12px',
                  border: `2px solid ${config.style === key ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  background: config.style === key ? 'rgba(108,92,231,0.1)' : 'var(--bg-tertiary)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{info.icon}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {info.label}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {info.desc}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Color Presets */}
      <div className="settings__group">
        <div className="settings__group-title">🎨 Color Preset</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: '8px 0'
        }}>
          {COLOR_PRESETS.map(preset => (
            <div
              key={preset.name}
              onClick={() => {
                updateConfig('colorStart', preset.start)
                updateConfig('colorEnd', preset.end)
              }}
              style={{
                padding: '10px',
                borderRadius: '10px',
                border: `2px solid ${config.colorStart === preset.start ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: 'var(--bg-tertiary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: `linear-gradient(135deg, ${preset.start}, ${preset.end})`
              }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{preset.name}</span>
            </div>
          ))}
        </div>
        <div className="settings__row">
          <div className="settings__label">Custom Start Color</div>
          <input
            type="color"
            value={config.colorStart}
            onChange={e => updateConfig('colorStart', e.target.value)}
            style={{ width: '40px', height: '30px', border: 'none', cursor: 'pointer' }}
          />
        </div>
        <div className="settings__row">
          <div className="settings__label">Custom End Color</div>
          <input
            type="color"
            value={config.colorEnd}
            onChange={e => updateConfig('colorEnd', e.target.value)}
            style={{ width: '40px', height: '30px', border: 'none', cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Parameters */}
      <div className="settings__group">
        <div className="settings__group-title">⚙️ Parameters</div>
        <div className="settings__row">
          <div>
            <div className="settings__label">Bar Count</div>
            <div className="settings__description">Number of frequency bars/segments</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="range" className="range-slider"
              min="16" max="128" step="16"
              value={config.barCount}
              onChange={e => updateConfig('barCount', parseInt(e.target.value))}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '30px' }}>
              {config.barCount}
            </span>
          </div>
        </div>
        <div className="settings__row">
          <div>
            <div className="settings__label">Smoothing</div>
            <div className="settings__description">Higher = smoother animation</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="range" className="range-slider"
              min="0" max="0.95" step="0.05"
              value={config.smoothing}
              onChange={e => updateConfig('smoothing', parseFloat(e.target.value))}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '35px' }}>
              {(config.smoothing * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="settings__row">
          <div>
            <div className="settings__label">Sensitivity</div>
            <div className="settings__description">Audio reactivity intensity</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="range" className="range-slider"
              min="0.2" max="3.0" step="0.1"
              value={config.sensitivity}
              onChange={e => updateConfig('sensitivity', parseFloat(e.target.value))}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '30px' }}>
              {config.sensitivity.toFixed(1)}x
            </span>
          </div>
        </div>
        <div className="settings__row">
          <div>
            <div className="settings__label">Opacity</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="range" className="range-slider"
              min="0.1" max="1.0" step="0.1"
              value={config.opacity}
              onChange={e => updateConfig('opacity', parseFloat(e.target.value))}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '30px' }}>
              {(config.opacity * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="settings__row">
          <div>
            <div className="settings__label">Mirror Effect</div>
            <div className="settings__description">Show reflection below bars</div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={config.mirror}
              onChange={e => updateConfig('mirror', e.target.checked)}
            />
            <span className="toggle__slider" />
          </label>
        </div>
      </div>

      {/* Preview */}
      <div className="settings__group">
        <div className="settings__group-title">👁 Preview</div>
        <div style={{
          height: '120px',
          borderRadius: '12px',
          background: '#05050a',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '2px',
          padding: '12px',
          overflow: 'hidden'
        }}>
          {Array.from({ length: Math.min(config.barCount, 40) }).map((_, i) => {
            const height = Math.sin(i * 0.3 + Date.now() * 0.001) * 30 + 50
            return (
              <div
                key={i}
                style={{
                  width: `${100 / Math.min(config.barCount, 40) - 1}%`,
                  height: `${height}%`,
                  background: `linear-gradient(to top, ${config.colorStart}, ${config.colorEnd})`,
                  borderRadius: '2px 2px 0 0',
                  opacity: config.opacity,
                  transition: 'height 0.1s ease'
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AudioVisualizerSettings
