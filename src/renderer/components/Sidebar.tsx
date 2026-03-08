interface SidebarProps {
  currentView: string
  onViewChange: (view: any) => void
  isPlaying: boolean
  onTogglePlay: () => void
  wallpaperCount: number
}

const menuItems = [
  { id: 'gallery', icon: '🖼', label: 'Gallery' },
  { id: 'favorites', icon: '❤️', label: 'Favorites' },
  { id: 'playlists', icon: '📋', label: 'Playlists' },
  { id: 'visualizer', icon: '🎵', label: 'Visualizer' },
  { id: 'system', icon: '📊', label: 'System' },
  { id: 'monitors', icon: '🖥', label: 'Monitors' },
  { id: 'settings', icon: '⚙️', label: 'Settings' }
]

function Sidebar({ currentView, onViewChange, isPlaying, onTogglePlay, wallpaperCount }: SidebarProps): JSX.Element {
  return (
    <nav className="sidebar">
      <div className="sidebar__section-title">Navigation</div>

      {menuItems.map(item => (
        <div
          key={item.id}
          className={`sidebar__item ${currentView === item.id ? 'sidebar__item--active' : ''}`}
          onClick={() => onViewChange(item.id)}
        >
          <span className="sidebar__icon">{item.icon}</span>
          <span>{item.label}</span>
          {item.id === 'gallery' && wallpaperCount > 0 && (
            <span className="sidebar__badge">{wallpaperCount}</span>
          )}
        </div>
      ))}

      <div className="sidebar__section-title" style={{ marginTop: '20px' }}>Controls</div>

      <div className="sidebar__item" onClick={onTogglePlay}>
        <span className="sidebar__icon">{isPlaying ? '⏸' : '▶️'}</span>
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
