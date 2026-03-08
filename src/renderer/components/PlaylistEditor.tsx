import { useState, useCallback } from 'react'
import { WallpaperItem } from '../App'

interface PlaylistEditorProps {
  wallpapers: WallpaperItem[]
}

interface PlaylistData {
  id: string
  name: string
  items: WallpaperItem[]
  mode: 'sequential' | 'random' | 'time-of-day'
  timerMinutes: number
  isActive: boolean
}

function PlaylistEditor({ wallpapers }: PlaylistEditorProps): JSX.Element {
  const [playlists, setPlaylists] = useState<PlaylistData[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const currentPlaylist = playlists.find(p => p.id === selectedPlaylist)

  const handleCreatePlaylist = useCallback((): void => {
    if (!newPlaylistName.trim()) return
    const newPlaylist: PlaylistData = {
      id: Date.now().toString(),
      name: newPlaylistName.trim(),
      items: [],
      mode: 'sequential',
      timerMinutes: 30,
      isActive: false
    }
    setPlaylists(prev => [...prev, newPlaylist])
    setSelectedPlaylist(newPlaylist.id)
    setNewPlaylistName('')
    setShowCreate(false)
  }, [newPlaylistName])

  const handleAddToPlaylist = useCallback((wallpaper: WallpaperItem): void => {
    if (!selectedPlaylist) return
    setPlaylists(prev =>
      prev.map(p =>
        p.id === selectedPlaylist
          ? { ...p, items: [...p.items, wallpaper] }
          : p
      )
    )
  }, [selectedPlaylist])

  const handleRemoveFromPlaylist = useCallback((index: number): void => {
    if (!selectedPlaylist) return
    setPlaylists(prev =>
      prev.map(p =>
        p.id === selectedPlaylist
          ? { ...p, items: p.items.filter((_, i) => i !== index) }
          : p
      )
    )
  }, [selectedPlaylist])

  const handleModeChange = useCallback((mode: PlaylistData['mode']): void => {
    if (!selectedPlaylist) return
    setPlaylists(prev =>
      prev.map(p => p.id === selectedPlaylist ? { ...p, mode } : p)
    )
  }, [selectedPlaylist])

  const handleTimerChange = useCallback((minutes: number): void => {
    if (!selectedPlaylist) return
    setPlaylists(prev =>
      prev.map(p => p.id === selectedPlaylist ? { ...p, timerMinutes: minutes } : p)
    )
  }, [selectedPlaylist])

  const handleDeletePlaylist = useCallback((id: string): void => {
    setPlaylists(prev => prev.filter(p => p.id !== id))
    if (selectedPlaylist === id) setSelectedPlaylist(null)
  }, [selectedPlaylist])

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Playlists</h1>
          <p className="page-header__subtitle">Create and manage wallpaper playlists</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
            ➕ New Playlist
          </button>
        </div>
      </div>

      {/* Create playlist dialog */}
      {showCreate && (
        <div className="settings__group" style={{ marginBottom: '20px' }}>
          <div className="settings__group-title">📋 Create New Playlist</div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Playlist name..."
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreatePlaylist()}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(26,26,46,0.6)', color: '#f0f0f5',
                fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none'
              }}
            />
            <button className="btn btn--primary btn--sm" onClick={handleCreatePlaylist}>Create</button>
            <button className="btn btn--sm" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Playlist list */}
        <div style={{ width: '240px', flexShrink: 0 }}>
          {playlists.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              color: 'var(--text-muted)', fontSize: '0.85rem'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.3 }}>📋</div>
              No playlists yet.
              <br />Click &ldquo;New Playlist&rdquo; to create one.
            </div>
          ) : (
            playlists.map(playlist => (
              <div
                key={playlist.id}
                className={`sidebar__item ${selectedPlaylist === playlist.id ? 'sidebar__item--active' : ''}`}
                onClick={() => setSelectedPlaylist(playlist.id)}
                style={{ borderRadius: '10px', marginBottom: '4px' }}
              >
                <span className="sidebar__icon">📋</span>
                <span style={{ flex: 1 }}>{playlist.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {playlist.items.length}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Playlist details */}
        <div style={{ flex: 1 }}>
          {currentPlaylist ? (
            <>
              {/* Settings */}
              <div className="settings__group" style={{ marginBottom: '16px' }}>
                <div className="settings__group-title">
                  ⚙️ {currentPlaylist.name} — Settings
                </div>
                <div className="settings__row">
                  <div className="settings__label">Rotation Mode</div>
                  <select
                    className="select"
                    value={currentPlaylist.mode}
                    onChange={e => handleModeChange(e.target.value as PlaylistData['mode'])}
                  >
                    <option value="sequential">Sequential</option>
                    <option value="random">Random</option>
                    <option value="time-of-day">Time of Day</option>
                  </select>
                </div>
                <div className="settings__row">
                  <div>
                    <div className="settings__label">Change Every</div>
                    <div className="settings__description">Auto-rotate wallpaper interval</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="range"
                      className="range-slider"
                      min="1"
                      max="120"
                      value={currentPlaylist.timerMinutes}
                      onChange={e => handleTimerChange(parseInt(e.target.value))}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '50px' }}>
                      {currentPlaylist.timerMinutes} min
                    </span>
                  </div>
                </div>
                <div className="settings__row">
                  <div />
                  <button
                    className="btn btn--sm"
                    onClick={() => handleDeletePlaylist(currentPlaylist.id)}
                    style={{ color: 'var(--danger)' }}
                  >
                    🗑 Delete Playlist
                  </button>
                </div>
              </div>

              {/* Playlist items */}
              <div className="settings__group">
                <div className="settings__group-title">
                  🎬 Wallpapers ({currentPlaylist.items.length})
                </div>
                {currentPlaylist.items.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '30px', color: 'var(--text-muted)',
                    fontSize: '0.85rem'
                  }}>
                    No wallpapers in this playlist. Add from the list below.
                  </div>
                ) : (
                  currentPlaylist.items.map((item, index) => (
                    <div key={index} className="settings__row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          width: '24px', height: '24px', borderRadius: '6px',
                          background: 'var(--accent-primary)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', color: 'white', fontWeight: 600
                        }}>
                          {index + 1}
                        </span>
                        <span className="settings__label">{item.name}</span>
                      </div>
                      <button
                        className="btn btn--sm btn--icon"
                        onClick={() => handleRemoveFromPlaylist(index)}
                        style={{ color: 'var(--danger)', width: '30px', height: '30px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Available wallpapers to add */}
              <div className="settings__group" style={{ marginTop: '16px' }}>
                <div className="settings__group-title">📁 Available Wallpapers</div>
                {wallpapers.filter(w =>
                  !currentPlaylist.items.some(i => i.path === w.path)
                ).map(wallpaper => (
                  <div key={wallpaper.id} className="settings__row">
                    <span className="settings__label">{wallpaper.name}</span>
                    <button
                      className="btn btn--sm"
                      onClick={() => handleAddToPlaylist(wallpaper)}
                    >
                      ➕ Add
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon">📋</div>
              <div className="empty-state__title">Select a Playlist</div>
              <div className="empty-state__description">
                Choose a playlist from the left or create a new one to get started.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PlaylistEditor
