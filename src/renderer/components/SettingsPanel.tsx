import { useState } from 'react'
import { t } from '../i18n'

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
      padding: '3px 10px', background: 'var(--bg-tertiary)',
      borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)',
      border: '1px solid var(--border-color)', fontFamily: 'monospace', letterSpacing: '0.5px'
    }}>{keys}</span>
  )

  return (
    <div className="settings animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">{t('settings.title')}</h1>
          <p className="page-header__subtitle">{t('settings.subtitle')}</p>
        </div>
        {saved && (
          <span style={{
            fontSize: '0.8rem', color: 'rgba(0,206,180,0.9)',
            display: 'flex', alignItems: 'center', gap: '5px',
            animation: 'fadeIn 0.3s ease'
          }}>
            {t('settings.saved')}
          </span>
        )}
      </div>

      {/* ── General ── */}
      <div className="settings__group">
        <div className="settings__group-title">{t('settings.general')}</div>
        <Toggle settingKey="autoStart" label={t('settings.autoStart')} description={t('settings.autoStart.desc')} />
        <Toggle settingKey="minimizeToTray" label={t('settings.minimizeToTray')} description={t('settings.minimizeToTray.desc')} />
        <SelectRow
          settingKey="theme"
          label={t('settings.theme')}
          description={t('settings.theme.desc')}
          options={[
            { value: 'dark',   label: t('settings.theme.dark') },
            { value: 'light',  label: t('settings.theme.light') },
            { value: 'system', label: t('settings.theme.system') },
          ]}
        />
        <SelectRow
          settingKey="language"
          label={t('settings.language')}
          description={t('settings.language.desc')}
          options={[
            { value: 'vi', label: '🇻🇳 Tiếng Việt' },
            { value: 'en', label: '🇺🇸 English' },
          ]}
        />
      </div>

      {/* ── Wallpaper ── */}
      <div className="settings__group">
        <div className="settings__group-title">{t('settings.wallpaper')}</div>
        <SelectRow
          settingKey="videoQuality"
          label={t('settings.quality')}
          description={t('settings.quality.desc')}
          options={[
            { value: 'auto', label: 'Auto Detect' },
            { value: '4k',   label: '4K (2160p)' },
            { value: '2k',   label: '2K (1440p)' },
            { value: 'fhd',  label: 'Full HD (1080p)' },
            { value: 'hd',   label: 'HD (720p)' },
          ]}
        />
        <div className="settings__row">
          <div>
            <div className="settings__label">{t('settings.fps')}</div>
            <div className="settings__description">{t('settings.fps.desc')}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="range" className="range-slider" min="10" max="60" step="5"
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
          label={t('settings.fillMode')}
          description={t('settings.fillMode.desc')}
          options={[
            { value: 'cover',   label: t('settings.fillMode.cover') },
            { value: 'contain', label: t('settings.fillMode.contain') },
            { value: 'stretch', label: t('settings.fillMode.stretch') },
          ]}
        />
      </div>

      {/* ── Audio ── */}
      <div className="settings__group">
        <div className="settings__group-title">{t('settings.audio')}</div>
        <Toggle settingKey="wallpaperMuted" label={t('settings.mute')} description={t('settings.mute.desc')} />
        <div className="settings__row">
          <div>
            <div className="settings__label">{t('settings.volume')}</div>
            <div className="settings__description">{t('settings.volume.desc')}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="range" className="range-slider" min="0" max="100"
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
        <div className="settings__group-title">{t('settings.performance')}</div>
        <Toggle settingKey="pauseOnFullscreen" label={t('settings.pauseFullscreen')} description={t('settings.pauseFullscreen.desc')} badge="Recommended" />
        <Toggle settingKey="pauseOnBattery" label={t('settings.battery')} description={t('settings.battery.desc')} badge="Recommended" />
        <div className="settings__row">
          <div>
            <div className="settings__label">{t('settings.hwAccel')}</div>
            <div className="settings__description">GPU rendering</div>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'rgba(0,206,180,0.75)', fontFamily: 'monospace' }}>
            {t('settings.hwAccel.value')}
          </span>
        </div>
      </div>

      {/* ── Desktop Dock ── */}
      <div className="settings__group">
        <div className="settings__group-title">{t('settings.dock')}</div>
        <Toggle settingKey="enableCustomDock" label={t('settings.dock.enable')} description={t('settings.dock.enable.desc')} badge="New" />
        {(settings.enableCustomDock as boolean) && (
          <>
            <div className="settings__row">
              <div>
                <div className="settings__label">{t('settings.dock.height')}</div>
                <div className="settings__description">{t('settings.dock.height.desc')}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="range" className="range-slider" min="60" max="120" step="4"
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
                <div className="settings__label">{t('settings.dock.hotkey')}</div>
                <div className="settings__description">{t('settings.dock.hotkey.desc')}</div>
              </div>
              {kbd('Ctrl + Alt + D')}
            </div>
            <div className="settings__row">
              <div>
                <div className="settings__label">{t('settings.dock.search')}</div>
                <div className="settings__description">{t('settings.dock.search.desc')}</div>
              </div>
              {kbd('Ctrl + Space')}
            </div>
          </>
        )}
      </div>

      {/* ── Screensaver ── */}
      <div className="settings__group">
        <div className="settings__group-title">{t('settings.screensaver')}</div>
        <Toggle settingKey="screensaverEnabled" label={t('settings.screensaver.enable')} description={t('settings.screensaver.enable.desc')} />
        {(settings.screensaverEnabled as boolean) && (
          <>
            <div className="settings__row">
              <div>
                <div className="settings__label">{t('settings.screensaver.idle')}</div>
                <div className="settings__description">{t('settings.screensaver.idle.desc')}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="range" className="range-slider" min="1" max="30" step="1"
                  value={(settings.screensaverIdleMinutes as number) ?? 10}
                  onChange={e => handleChange('screensaverIdleMinutes', parseInt(e.target.value))}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '48px' }}>
                  {(settings.screensaverIdleMinutes as number) ?? 10} min
                </span>
              </div>
            </div>
            <Toggle settingKey="screensaverUseCurrentWallpaper" label={t('settings.screensaver.current')} description={t('settings.screensaver.current.desc')} />
          </>
        )}
      </div>

      {/* ── Hotkeys ── */}
      <div className="settings__group">
        <div className="settings__group-title">{t('settings.hotkeys')}</div>
        {[
          { label: t('settings.hotkey.next'),   keys: 'Ctrl + Alt + N' },
          { label: t('settings.hotkey.play'),   keys: 'Ctrl + Alt + P' },
          { label: t('settings.hotkey.dock'),   keys: 'Ctrl + Alt + D' },
          { label: t('settings.hotkey.search'), keys: 'Ctrl + Space' },
        ].map(({ label, keys }) => (
          <div key={keys} className="settings__row">
            <div className="settings__label">{label}</div>
            {kbd(keys)}
          </div>
        ))}
      </div>

      {/* ── About ── */}
      <div className="settings__group">
        <div className="settings__group-title">{t('settings.about')}</div>
        <div className="settings__row">
          <div className="settings__label">{t('settings.version')}</div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>v1.0.0</span>
        </div>
        <div className="settings__row">
          <div className="settings__label">{t('settings.author')}</div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>KmaNghia18</span>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
