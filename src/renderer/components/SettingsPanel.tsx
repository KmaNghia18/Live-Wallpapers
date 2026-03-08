interface SettingsPanelProps {
  settings: Record<string, unknown>
  onSettingChange: (key: string, value: unknown) => void
}

function SettingsPanel({ settings, onSettingChange }: SettingsPanelProps): JSX.Element {
  const Toggle = ({ settingKey, label, description }: { settingKey: string; label: string; description?: string }): JSX.Element => (
    <div className="settings__row">
      <div>
        <div className="settings__label">{label}</div>
        {description && <div className="settings__description">{description}</div>}
      </div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={settings[settingKey] as boolean ?? false}
          onChange={e => onSettingChange(settingKey, e.target.checked)}
        />
        <span className="toggle__slider" />
      </label>
    </div>
  )

  return (
    <div className="settings animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Settings</h1>
          <p className="page-header__subtitle">Configure your live wallpaper experience</p>
        </div>
      </div>

      {/* General */}
      <div className="settings__group">
        <div className="settings__group-title">⚙️ General</div>
        <Toggle settingKey="autoStart" label="Start with Windows" description="Launch automatically when you log in" />
        <Toggle settingKey="minimizeToTray" label="Minimize to Tray" description="Keep running in background when closed" />
        <div className="settings__row">
          <div>
            <div className="settings__label">Theme</div>
            <div className="settings__description">App appearance</div>
          </div>
          <select
            className="select"
            value={settings.theme as string ?? 'dark'}
            onChange={e => onSettingChange('theme', e.target.value)}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>

      {/* Wallpaper */}
      <div className="settings__group">
        <div className="settings__group-title">🖼 Wallpaper</div>
        <div className="settings__row">
          <div>
            <div className="settings__label">Video Quality</div>
            <div className="settings__description">Auto-detect or force specific resolution</div>
          </div>
          <select
            className="select"
            value={settings.videoQuality as string ?? 'auto'}
            onChange={e => onSettingChange('videoQuality', e.target.value)}
          >
            <option value="auto">Auto Detect</option>
            <option value="4k">4K (2160p)</option>
            <option value="2k">2K (1440p)</option>
            <option value="fhd">Full HD (1080p)</option>
            <option value="hd">HD (720p)</option>
          </select>
        </div>
        <div className="settings__row">
          <div>
            <div className="settings__label">FPS Limit</div>
            <div className="settings__description">Limit frame rate to save resources</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="range"
              className="range-slider"
              min="15"
              max="60"
              step="5"
              value={settings.fpsLimit as number ?? 30}
              onChange={e => onSettingChange('fpsLimit', parseInt(e.target.value))}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '40px' }}>
              {settings.fpsLimit as number ?? 30} fps
            </span>
          </div>
        </div>
        <div className="settings__row">
          <div>
            <div className="settings__label">Fill Mode</div>
            <div className="settings__description">How wallpaper fills the screen</div>
          </div>
          <select
            className="select"
            value={settings.fillMode as string ?? 'cover'}
            onChange={e => onSettingChange('fillMode', e.target.value)}
          >
            <option value="cover">Cover (fill screen)</option>
            <option value="contain">Contain (fit inside)</option>
            <option value="stretch">Stretch</option>
          </select>
        </div>
      </div>

      {/* Audio */}
      <div className="settings__group">
        <div className="settings__group-title">🔊 Audio</div>
        <Toggle settingKey="wallpaperMuted" label="Mute Wallpaper Audio" description="Mute sound from video wallpapers" />
        <div className="settings__row">
          <div>
            <div className="settings__label">Volume</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="range"
              className="range-slider"
              min="0"
              max="100"
              value={settings.wallpaperVolume as number ?? 50}
              onChange={e => onSettingChange('wallpaperVolume', parseInt(e.target.value))}
              disabled={settings.wallpaperMuted as boolean}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '35px' }}>
              {settings.wallpaperVolume as number ?? 50}%
            </span>
          </div>
        </div>
      </div>

      {/* Performance */}
      <div className="settings__group">
        <div className="settings__group-title">⚡ Performance</div>
        <Toggle settingKey="pauseOnFullscreen" label="Pause on Fullscreen App" description="Auto-pause when games or apps go fullscreen" />
        <Toggle settingKey="pauseOnBattery" label="Battery Saver" description="Reduce quality and FPS when on battery power" />
      </div>

      {/* Hotkeys */}
      <div className="settings__group">
        <div className="settings__group-title">⌨️ Hotkeys</div>
        <div className="settings__row">
          <div>
            <div className="settings__label">Next Wallpaper</div>
          </div>
          <span style={{
            padding: '4px 12px',
            background: 'var(--bg-tertiary)',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)'
          }}>
            Ctrl + Alt + N
          </span>
        </div>
        <div className="settings__row">
          <div>
            <div className="settings__label">Play / Pause</div>
          </div>
          <span style={{
            padding: '4px 12px',
            background: 'var(--bg-tertiary)',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)'
          }}>
            Ctrl + Alt + P
          </span>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
