import { useState, useEffect, useCallback } from 'react'
import { WallpaperItem } from '../App'

interface PlaylistData {
  id: string
  name: string
  items: WallpaperItem[]
  mode: 'sequential' | 'random' | 'time-of-day'
  timerMinutes: number
  isActive: boolean
  currentIndex: number
}

interface PlaylistEditorProps {
  wallpapers: WallpaperItem[]
  currentWallpaper?: string | null
  onSetWallpaper?: (w: WallpaperItem) => void
}

const STORAGE_KEY = 'wp_playlists_v2'

function loadFromStorage(): PlaylistData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}
function saveToStorage(pl: PlaylistData[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pl)) } catch {}
}

const MODE_LABELS: Record<PlaylistData['mode'], string> = {
  sequential: '▶ Tuần tự',
  random: '🔀 Ngẫu nhiên',
  'time-of-day': '🕐 Theo giờ',
}

function PlaylistEditor({ wallpapers, currentWallpaper, onSetWallpaper }: PlaylistEditorProps): JSX.Element {
  const [playlists, setPlaylists] = useState<PlaylistData[]>(loadFromStorage)
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const saved = loadFromStorage()
    return saved[0]?.id ?? null
  })
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [timerHandle, setTimerHandle] = useState<ReturnType<typeof setInterval> | null>(null)

  // Persist on every change
  useEffect(() => { saveToStorage(playlists) }, [playlists])

  const selected = playlists.find(p => p.id === selectedId) ?? null
  const activePlaylist = playlists.find(p => p.isActive) ?? null

  // Auto-rotate timer
  useEffect(() => {
    if (timerHandle) clearInterval(timerHandle)
    if (!activePlaylist || activePlaylist.items.length < 2) return
    const h = setInterval(() => {
      setPlaylists(prev => prev.map(p => {
        if (!p.isActive) return p
        const nextIdx = p.mode === 'random'
          ? Math.floor(Math.random() * p.items.length)
          : (p.currentIndex + 1) % p.items.length
        const nextItem = p.items[nextIdx]
        if (nextItem && onSetWallpaper) onSetWallpaper(nextItem)
        return { ...p, currentIndex: nextIdx }
      }))
    }, (activePlaylist.timerMinutes || 30) * 60 * 1000)
    setTimerHandle(h)
    return () => clearInterval(h)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlaylist?.id, activePlaylist?.timerMinutes, activePlaylist?.mode])

  const createPlaylist = useCallback((): void => {
    if (!newName.trim()) return
    const p: PlaylistData = {
      id: Date.now().toString(),
      name: newName.trim(),
      items: [],
      mode: 'sequential',
      timerMinutes: 30,
      isActive: false,
      currentIndex: 0,
    }
    setPlaylists(prev => { const next = [...prev, p]; saveToStorage(next); return next })
    setSelectedId(p.id)
    setNewName('')
    setShowCreate(false)
  }, [newName])

  const deletePlaylist = useCallback((id: string): void => {
    setPlaylists(prev => { const next = prev.filter(p => p.id !== id); saveToStorage(next); return next })
    if (selectedId === id) setSelectedId(null)
  }, [selectedId])

  const updatePlaylist = useCallback((id: string, patch: Partial<PlaylistData>): void => {
    setPlaylists(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...patch } : p)
      saveToStorage(next)
      return next
    })
  }, [])

  const activatePlaylist = useCallback((id: string): void => {
    setPlaylists(prev => {
      const next = prev.map(p => ({ ...p, isActive: p.id === id }))
      saveToStorage(next)
      const pl = next.find(p => p.id === id)
      if (pl && pl.items.length > 0 && onSetWallpaper) onSetWallpaper(pl.items[pl.currentIndex])
      return next
    })
  }, [onSetWallpaper])

  const deactivateAll = useCallback((): void => {
    setPlaylists(prev => {
      const next = prev.map(p => ({ ...p, isActive: false }))
      saveToStorage(next); return next
    })
  }, [])

  const addToPlaylist = useCallback((wallpaper: WallpaperItem): void => {
    if (!selectedId) return
    setPlaylists(prev => {
      const next = prev.map(p => {
        if (p.id !== selectedId) return p
        if (p.items.some(i => i.path === wallpaper.path)) return p
        return { ...p, items: [...p.items, wallpaper] }
      })
      saveToStorage(next); return next
    })
  }, [selectedId])

  const removeFromPlaylist = useCallback((index: number): void => {
    if (!selectedId) return
    setPlaylists(prev => {
      const next = prev.map(p => p.id !== selectedId ? p : {
        ...p,
        items: p.items.filter((_, i) => i !== index),
        currentIndex: Math.max(0, p.currentIndex > index ? p.currentIndex - 1 : p.currentIndex)
      })
      saveToStorage(next); return next
    })
  }, [selectedId])

  const moveItem = useCallback((from: number, to: number): void => {
    if (!selectedId) return
    setPlaylists(prev => {
      const next = prev.map(p => {
        if (p.id !== selectedId) return p
        const items = [...p.items]
        const [item] = items.splice(from, 1)
        items.splice(to, 0, item)
        return { ...p, items }
      })
      saveToStorage(next); return next
    })
  }, [selectedId])

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Playlists</h1>
          <p className="page-header__subtitle">
            Tạo danh sách wallpaper tự động xoay vòng
            {activePlaylist && (
              <span style={{ marginLeft: 10, color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600 }}>
                ● Đang phát: {activePlaylist.name}
              </span>
            )}
          </p>
        </div>
        <div className="page-header__actions" style={{ display: 'flex', gap: 8 }}>
          {activePlaylist && (
            <button className="btn btn--sm" onClick={deactivateAll} style={{ color: 'var(--danger)' }}>
              ⏹ Dừng
            </button>
          )}
          <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
            + New Playlist
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="settings__group" style={{ marginBottom: 16 }}>
          <div className="settings__group-title">📋 Tạo Playlist Mới</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              autoFocus
              type="text"
              placeholder="Tên playlist..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createPlaylist()}
              style={{
                flex: 1, padding: '9px 13px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(26,26,46,0.7)', color: '#f0f0f5',
                fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none'
              }}
            />
            <button className="btn btn--primary btn--sm" onClick={createPlaylist}>Tạo</button>
            <button className="btn btn--sm" onClick={() => setShowCreate(false)}>Hủy</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Left: playlist list */}
        <div style={{ width: 220, flexShrink: 0 }}>
          {playlists.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10, opacity: 0.25 }}>📋</div>
              Chưa có playlist nào.<br />Nhấn "New Playlist" để tạo.
            </div>
          ) : (
            playlists.map(pl => (
              <div
                key={pl.id}
                onClick={() => setSelectedId(pl.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 12px', borderRadius: 10, marginBottom: 4,
                  cursor: 'pointer', transition: 'background 0.15s ease',
                  background: selectedId === pl.id
                    ? 'rgba(108,92,231,0.2)' : 'rgba(255,255,255,0.03)',
                  border: selectedId === pl.id
                    ? '1px solid rgba(108,92,231,0.35)' : '1px solid transparent',
                }}
              >
                <span style={{ fontSize: '1rem', lineHeight: 1 }}>
                  {pl.isActive ? '▶️' : '📋'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.82rem', fontWeight: pl.isActive ? 600 : 400,
                    color: pl.isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>{pl.name}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>
                    {pl.items.length} wallpaper · {MODE_LABELS[pl.mode].split(' ')[0]}
                  </div>
                </div>
                {pl.isActive && (
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#00d4a0', flexShrink: 0,
                    boxShadow: '0 0 6px #00d4a0'
                  }} />
                )}
              </div>
            ))
          )}
        </div>

        {/* Right: detail panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selected ? (
            <>
              {/* Settings */}
              <div className="settings__group" style={{ marginBottom: 14 }}>
                <div className="settings__group-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>⚙️ {selected.name}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {selected.isActive ? (
                      <button className="btn btn--sm" onClick={deactivateAll} style={{ color: 'var(--danger)' }}>⏹ Dừng</button>
                    ) : (
                      <button
                        className="btn btn--sm btn--primary"
                        onClick={() => activatePlaylist(selected.id)}
                        disabled={selected.items.length === 0}
                        title={selected.items.length === 0 ? 'Thêm wallpaper trước' : 'Bắt đầu phát playlist'}
                      >
                        ▶ Phát
                      </button>
                    )}
                    <button className="btn btn--sm" onClick={() => deletePlaylist(selected.id)} style={{ color: 'var(--danger)' }}>
                      🗑
                    </button>
                  </div>
                </div>

                <div className="settings__row">
                  <div className="settings__label">Chế độ xoay</div>
                  <select
                    className="select"
                    value={selected.mode}
                    onChange={e => updatePlaylist(selected.id, { mode: e.target.value as PlaylistData['mode'] })}
                  >
                    <option value="sequential">▶ Tuần tự</option>
                    <option value="random">🔀 Ngẫu nhiên</option>
                    <option value="time-of-day">🕐 Theo giờ trong ngày</option>
                  </select>
                </div>

                <div className="settings__row">
                  <div>
                    <div className="settings__label">Đổi sau mỗi</div>
                    <div className="settings__description">Tự động chuyển wallpaper</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="range" className="range-slider"
                      min="1" max="180" step="1"
                      value={selected.timerMinutes}
                      onChange={e => updatePlaylist(selected.id, { timerMinutes: parseInt(e.target.value) })}
                    />
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', minWidth: 56 }}>
                      {selected.timerMinutes >= 60
                        ? `${(selected.timerMinutes / 60).toFixed(1)}h`
                        : `${selected.timerMinutes} phút`}
                    </span>
                  </div>
                </div>

                {selected.mode === 'time-of-day' && (
                  <div style={{ padding: '8px 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Chế độ "Theo giờ": Sáng 6–12h · Chiều 12–17h · Tối 17–21h · Đêm 21–6h
                  </div>
                )}
              </div>

              {/* Current playlist items */}
              <div className="settings__group" style={{ marginBottom: 14 }}>
                <div className="settings__group-title">
                  🎬 Wallpapers trong playlist ({selected.items.length})
                </div>
                {selected.items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    Chưa có wallpaper. Thêm từ danh sách bên dưới.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {selected.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px',
                          borderRadius: 9,
                          background: selected.isActive && idx === selected.currentIndex
                            ? 'rgba(108,92,231,0.15)'
                            : 'rgba(255,255,255,0.03)',
                          border: selected.isActive && idx === selected.currentIndex
                            ? '1px solid rgba(108,92,231,0.3)' : '1px solid transparent'
                        }}
                      >
                        {/* Index badge */}
                        <span style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                          background: selected.isActive && idx === selected.currentIndex
                            ? 'var(--accent-primary)' : 'rgba(108,92,231,0.18)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.65rem', color: 'white', fontWeight: 700
                        }}>
                          {selected.isActive && idx === selected.currentIndex ? '▶' : idx + 1}
                        </span>
                        {/* Thumbnail */}
                        <div style={{
                          width: 40, height: 26, borderRadius: 5, overflow: 'hidden', flexShrink: 0,
                          background: 'rgba(255,255,255,0.05)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {item.type === 'video' || item.type === 'gif' ? (
                            <span style={{ fontSize: '0.9rem' }}>🎬</span>
                          ) : (
                            <img
                              src={`file://${item.thumbnail}`}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          )}
                        </div>
                        <span style={{
                          flex: 1, fontSize: '0.8rem', color: 'var(--text-primary)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>{item.name}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginRight: 4 }}>
                          {item.type.toUpperCase()}
                        </span>
                        {/* Move up */}
                        {idx > 0 && (
                          <button
                            onClick={() => moveItem(idx, idx - 1)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px', fontSize: '0.75rem' }}
                            title="Lên trên"
                          >↑</button>
                        )}
                        {/* Move down */}
                        {idx < selected.items.length - 1 && (
                          <button
                            onClick={() => moveItem(idx, idx + 1)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px', fontSize: '0.75rem' }}
                            title="Xuống dưới"
                          >↓</button>
                        )}
                        {/* Play now */}
                        <button
                          onClick={() => { if (onSetWallpaper) { onSetWallpaper(item); updatePlaylist(selected.id, { currentIndex: idx }) } }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 5px', fontSize: '0.75rem' }}
                          title="Phát ngay"
                        >▶</button>
                        {/* Remove */}
                        <button
                          onClick={() => removeFromPlaylist(idx)}
                          style={{ background: 'none', border: 'none', color: 'rgba(220,80,80,0.6)', cursor: 'pointer', padding: '2px 5px', fontSize: '0.75rem' }}
                          title="Xóa khỏi playlist"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available wallpapers */}
              <div className="settings__group">
                <div className="settings__group-title">
                  📁 Thêm wallpaper ({wallpapers.filter(w => !selected.items.some(i => i.path === w.path)).length} có sẵn)
                </div>
                {wallpapers.filter(w => !selected.items.some(i => i.path === w.path)).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Tất cả wallpaper đã có trong playlist.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {wallpapers
                      .filter(w => !selected.items.some(i => i.path === w.path))
                      .map(w => (
                        <div key={w.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '6px 10px', borderRadius: 8,
                            background: w.path === currentWallpaper
                              ? 'rgba(108,92,231,0.08)' : 'rgba(255,255,255,0.02)',
                          }}
                        >
                          <div style={{
                            width: 40, height: 26, borderRadius: 5, overflow: 'hidden', flexShrink: 0,
                            background: 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <span style={{ fontSize: '0.85rem' }}>
                              {w.type === 'video' ? '🎬' : w.type === 'gif' ? '🎞️' : '🖼️'}
                            </span>
                          </div>
                          <span style={{
                            flex: 1, fontSize: '0.8rem', color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}>{w.name}</span>
                          <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{w.type}</span>
                          <button
                            className="btn btn--sm"
                            onClick={() => addToPlaylist(w)}
                            style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                          >
                            + Thêm
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon">📋</div>
              <div className="empty-state__title">Chọn một Playlist</div>
              <div className="empty-state__description">
                Chọn playlist từ bên trái hoặc tạo playlist mới để bắt đầu.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PlaylistEditor
