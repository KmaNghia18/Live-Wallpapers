import { useState } from 'react'

interface SettingsPanelProps {
  settings: Record<string, unknown>
  onSettingChange: (key: string, value: unknown) => void
}

function SettingsPanel({ settings, onSettingChange }: SettingsPanelProps): JSX.Element {
  const [saved, setSaved] = useState(false)

  const handleChange = (key: string, value: unknown): void => {
    onSettingChange(key, value)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  // Toggle row component
  const Toggle = ({
    settingKey, label, description, badge
  }: { settingKey: string; label: string; description?: string; badge?: string }): JSX.Element => (
    <div className="settings__row">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="settings__label">{label}</div>
          {badge && (
            <span style={{
              fontSize: '0.68rem', padding: '1px 7px', borderRadius: '10px',
              background: 'rgba(108,92,231,0.2)', color: 'rgba(168,130,255,0.9)',
              border: '1px solid rgba(108,92,231,0.3)', fontWeight: 500
            }}>{badge}</span>
          )}
        </div>
        {description && <div className="settings__description">{description}</div>}
      </div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={(settings[settingKey] as boolean) ?? false}
          onChange={e => handleChange(settingKey, e.target.checked)}
        />
        <span className="toggle__slider" />
      </label>
    </div>
  )

  // Select row component
  const SelectRow = ({
    settingKey, label, description, options
  }: { settingKey: string; label: string; description?: string; options: { value: string; label: string }[] }): JSX.Element => (
    <div className="settings__row">
      <div>
        <div className="settings__label">{label}</div>
        {description && <div className="settings__description">{description}</div>}
      </div>
      <select
        className="select"
        value={(settings[settingKey] as string) ?? options[0].value}
        onChange={e => handleChange(settingKey, e.target.value)}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )

  const kbd = (keys: string): JSX.Element => (
    <span style={{
      padding: '3px 10px',
      background: 'var(--bg-tertiary)',
      borderRadius: '6px', fontSize: '0.78rem',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border-color)',
      fontFamily: 'monospace', letterSpacing: '0.5px'
    }}>{keys}</span>
  )

  return (
    <div className="settings animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Settings</h1>
          <p className="page-header__subtitle">Configure your live wallpaper experience</p>
        </div>
        {saved && (
          <span style={{
            fontSize: '0.8rem', color: 'rgba(0,206,180,0.9)',
            display: 'flex', alignItems: 'center', gap: '5px',
            animation: 'fadeIn 0.3s ease'
          }}>
            ✓ Saved
          </span>
        )}
      </div>

      {/* ── General ── */}
      <div className="settings__group">
        <div className="settings__group-title">⚙️ General</div>
        <Toggle settingKey="autoStart" label="Start with Windows" description="Launch automatically when you log in" />
        <Toggle settingKey="minimizeToTray" label="Minimize to Tray" description="Keep running in background when closed" />
        <SelectRow
          settingKey="theme"
          label="Theme"
          description="App appearance"
          options={[
            { value: 'dark',   label: '🌙 Dark' },
            { value: 'light',  label: '☀️ Light' },
            { value: 'system', label: '🖥 System' }
          ]}
        />
        <SelectRow
          settingKey="language"
          label="Language"
          description="Display language"
          options={[
            { value: 'vi', label: '🇻🇳 Tiếng Việt' },
            { value: 'en', label: '🇺🇸 English' }
          ]}
        />
      </div>

      {/* ── Wallpaper ── */}
      <div className="settings__group">
        <div className="settings__group-title">🖼️ Wallpaper</div>
        <SelectRow
          settingKey="videoQuality"
          label="Video Quality"
          description="Auto-detect or force specific resolution"
          options={[
            { value: 'auto', label: 'Auto Detect' },
            { value: '4k',   label: '4K (2160p)' },
            { value: '2k',   label: '2K (1440p)' },
            { value: 'fhd',  label: 'Full HD (1080p)' },
            { value: 'hd',   label: 'HD (720p)' }
          ]}
        />
        <div className="settings__row">
          <div>
            <div className="settings__label">FPS Limit</div>
            <div className="settings__description">Limit frame rate to save resources</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="range" className="range-slider"
              min="10" max="60" step="5"
              value={(settings.fpsLimit as number) ?? 30}
              onChange={e => handleChange('fpsLimit', parseInt(e.target.value))}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '48px' }}>
              {(settings.fpsLimit as number) ?? 30} fps
            </span>
          </div>
        </div>
        <SelectRow
          settingKey="fillMode"
          label="Fill Mode"
          description="How wallpaper fills the screen"
          options={[
            { value: 'cover',   label: 'Cover (fill screen)' },
            { value: 'contain', label: 'Contain (fit inside)' },
            { value: 'stretch', label: 'Stretch' }
          ]}
        />
      </div>

      {/* ── Audio ── */}
      <div className="settings__group">
        <div className="settings__group-title">🔊 Audio</div>
        <Toggle settingKey="wallpaperMuted" label="Mute Wallpaper Audio" description="Mute sound from video wallpapers" />
        <div className="settings__row">
          <div>
            <div className="settings__label">Volume</div>
            <div className="settings__description">Wallpaper audio level</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="range" className="range-slider"
              min="0" max="100"
              value={(settings.wallpaperVolume as number) ?? 50}
              onChange={e => handleChange('wallpaperVolume', parseInt(e.target.value))}
              disabled={(settings.wallpaperMuted as boolean) ?? false}
              style={{ opacity: (settings.wallpaperMuted as boolean) ? 0.4 : 1 }}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '38px' }}>
              {(settings.wallpaperMuted as boolean) ? 'Muted' : `${(settings.wallpaperVolume as number) ?? 50}%`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Performance ── */}
      <div className="settings__group">
        <div className="settings__group-title">⚡ Performance</div>
        <Toggle
          settingKey="pauseOnFullscreen"
          label="Pause on Fullscreen App"
          description="Auto-pause when games or apps go fullscreen"
          badge="Recommended"
        />
        <Toggle
          settingKey="pauseOnBattery"
          label="Battery Saver"
          description="Reduce quality and FPS when on battery power"
          badge="Recommended"
        />
        <div className="settings__row">
          <div>
            <div className="settings__label">Hardware Acceleration</div>
            <div className="settings__description">Use GPU for smoother playback</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'rgba(0,206,180,0.75)', fontFamily: 'monospace' }}>
              Always On
            </span>
          </div>
        </div>
      </div>

      {/* ── Desktop Dock ── */}
      <div className="settings__group">
        <div className="settings__group-title">🖥️ Desktop Dock</div>
        <Toggle
          settingKey="enableCustomDock"
          label="Enable Custom Dock"
          description="Replace Windows taskbar with a premium galaxy-style dock"
          badge="New"
        />
        {(settings.enableCustomDock as boolean) && (
          <>
            <div className="settings__row">
              <div>
                <div className="settings__label">Dock Height</div>
                <div className="settings__description">Size of the dock bar</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="range" className="range-slider"
                  min="60" max="120" step="4"
                  value={(settings.dockHeight as number) ?? 80}
                  onChange={e => handleChange('dockHeight', parseInt(e.target.value))}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '38px' }}>
                  {(settings.dockHeight as number) ?? 80}px
                </span>
              </div>
            </div>
            <div className="settings__row">
              <div>
                <div className="settings__label">Dock Hotkey</div>
                <div className="settings__description">Toggle dock visibility</div>
              </div>
              {kbd('Ctrl + Alt + D')}
            </div>
            <div className="settings__row">
              <div>
                <div className="settings__label">Search Launcher</div>
                <div className="settings__description">Open app search from dock</div>
              </div>
              {kbd('Ctrl + Space')}
            </div>
          </>
        )}
      </div>

      {/* ── Screensaver ── */}
      <div className="settings__group">
        <div className="settings__group-title">🌀 Screensaver</div>
        <Toggle
          settingKey="screensaverEnabled"
          label="Enable Screensaver"
          description="Show animated screensaver when idle"
        />
        {(settings.screensaverEnabled as boolean) && (
          <>
            <div className="settings__row">
              <div>
                <div className="settings__label">Idle Timeout</div>
                <div className="settings__description">Start screensaver after inactivity</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="range" className="range-slider"
                  min="1" max="30" step="1"
                  value={(settings.screensaverIdleMinutes as number) ?? 10}
                  onChange={e => handleChange('screensaverIdleMinutes', parseInt(e.target.value))}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '48px' }}>
                  {(settings.screensaverIdleMinutes as number) ?? 10} min
                </span>
              </div>
            </div>
            <Toggle
              settingKey="screensaverUseCurrentWallpaper"
              label="Use Current Wallpaper"
              description="Use active wallpaper as screensaver"
            />
          </>
        )}
      </div>

      {/* ── Hotkeys ── */}
      <div className="settings__group">
        <div className="settings__group-title">⌨️ Hotkeys</div>
        {[
          { label: 'Next Wallpaper',  keys: 'Ctrl + Alt + N' },
          { label: 'Play / Pause',    keys: 'Ctrl + Alt + P' },
          { label: 'Toggle Dock',     keys: 'Ctrl + Alt + D' },
          { label: 'Dock Search',     keys: 'Ctrl + Space' }
        ].map(({ label, keys }) => (
          <div key={keys} className="settings__row">
            <div className="settings__label">{label}</div>
            {kbd(keys)}
          </div>
        ))}
      </div>

      {/* ── About ── */}
      <div className="settings__group">
        <div className="settings__group-title">ℹ️ About</div>
        <div className="settings__row">
          <div className="settings__label">Version</div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>v1.0.0</span>
        </div>
        <div className="settings__row">
          <div className="settings__label">Author</div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>KmaNghia18</span>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
