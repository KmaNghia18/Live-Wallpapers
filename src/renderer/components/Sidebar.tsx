import {
  IconGallery, IconHeart, IconPlaylist, IconMusic,
  IconActivity, IconMonitor, IconSettings,
  IconPlay, IconPause
} from './Icons'

interface SidebarProps {
  currentView: string
  onViewChange: (view: any) => void
  isPlaying: boolean
  onTogglePlay: () => void
  wallpaperCount: number
}

const menuItems = [
  { id: 'gallery', icon: IconGallery, label: 'Gallery' },
  { id: 'favorites', icon: IconHeart, label: 'Favorites' },
  { id: 'playlists', icon: IconPlaylist, label: 'Playlists' },
  { id: 'visualizer', icon: IconMusic, label: 'Visualizer' },
  { id: 'system', icon: IconActivity, label: 'System' },
  { id: 'monitors', icon: IconMonitor, label: 'Monitors' },
  { id: 'settings', icon: IconSettings, label: 'Settings' }
]

function Sidebar({ currentView, onViewChange, isPlaying, onTogglePlay, wallpaperCount }: SidebarProps): JSX.Element {
  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar__brand">
        <div className="sidebar__brand-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6c5ce7" />
                <stop offset="100%" stopColor="#a29bfe" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#logoGrad)" />
            <polygon points="10,7 18,12 10,17" fill="white" />
          </svg>
        </div>
        <span className="sidebar__brand-text">LiveWall</span>
      </div>

      <div className="sidebar__section-title">Navigation</div>

      {menuItems.map(item => {
        const IconComponent = item.icon
        return (
          <div
            key={item.id}
            className={`sidebar__item ${currentView === item.id ? 'sidebar__item--active' : ''}`}
            onClick={() => onViewChange(item.id)}
            title={item.label}
          >
            <span className="sidebar__icon">
              <IconComponent size={18} />
            </span>
            <span>{item.label}</span>
            {item.id === 'gallery' && wallpaperCount > 0 && (
              <span className="sidebar__badge">{wallpaperCount}</span>
            )}
          </div>
        )
      })}

      <div className="sidebar__divider" />

      <div className="sidebar__section-title">Controls</div>

      <div className="sidebar__item" onClick={onTogglePlay}>
        <span className="sidebar__icon">
          {isPlaying ? <IconPause size={18} /> : <IconPlay size={18} />}
        </span>
        <span>{isPlaying ? 'Pause' : 'Play'}</span>
      </div>

      <div className="sidebar__footer">
        <div className="sidebar__status">
          <div className={`sidebar__status-dot ${!isPlaying ? 'sidebar__status-dot--paused' : ''}`} />
          <span>{isPlaying ? 'Wallpaper Active' : 'Paused'}</span>
        </div>
      </div>
    </nav>
  )
}

export default Sidebar
