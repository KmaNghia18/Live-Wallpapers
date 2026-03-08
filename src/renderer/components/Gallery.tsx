import { useState, useRef, useCallback } from 'react'
import WallpaperCard from './WallpaperCard'
import { WallpaperItem } from '../App'

interface GalleryProps {
  wallpapers: WallpaperItem[]
  currentWallpaper: string | null
  onSetWallpaper: (wallpaper: WallpaperItem) => void
  onAddWallpapers: () => void
  onToggleFavorite: (id: string) => void
  onRemoveWallpaper: (path: string) => void
  title?: string
  subtitle?: string
}

function Gallery({
  wallpapers,
  currentWallpaper,
  onSetWallpaper,
  onAddWallpapers,
  onToggleFavorite,
  onRemoveWallpaper,
  title = 'Gallery',
  subtitle = 'Your wallpaper collection'
}: GalleryProps): JSX.Element {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [isDragging, setIsDragging] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  const filteredWallpapers = wallpapers.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || w.type === filterType
    return matchesSearch && matchesType
  })

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    // Files dropped — trigger add dialog (since we can't read local files directly in sandbox)
    onAddWallpapers()
  }, [onAddWallpapers])

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">{title}</h1>
          <p className="page-header__subtitle">{subtitle}</p>
        </div>
        <div className="page-header__actions">
          <input
            type="text"
            placeholder="🔍 Search wallpapers..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(26, 26, 46, 0.6)',
              color: '#f0f0f5',
              fontFamily: 'inherit',
              fontSize: '0.85rem',
              width: '220px',
              outline: 'none',
              backdropFilter: 'blur(10px)'
            }}
          />
          <select
            className="select"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="video">Video</option>
            <option value="gif">GIF</option>
            <option value="image">Image</option>
          </select>
          <button className="btn btn--primary" onClick={onAddWallpapers}>
            ➕ Add Wallpaper
          </button>
        </div>
      </div>

      {wallpapers.length === 0 ? (
        <div
          ref={dropRef}
          className={`drop-zone ${isDragging ? 'drop-zone--active' : ''}`}
          onClick={onAddWallpapers}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="drop-zone__icon">📁</div>
          <div className="drop-zone__text">
            Drop video files here or click to browse
          </div>
          <div className="drop-zone__hint">
            Supports: MP4, WebM, MKV, AVI, MOV, GIF, PNG, JPG
          </div>
        </div>
      ) : (
        <div
          className="gallery"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Add new card */}
          <div
            className="wallpaper-card"
            onClick={onAddWallpapers}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '220px' }}
          >
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px', opacity: 0.3 }}>➕</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Add Wallpaper</div>
            </div>
          </div>

          {filteredWallpapers.map(wallpaper => (
            <WallpaperCard
              key={wallpaper.id}
              wallpaper={wallpaper}
              isActive={wallpaper.path === currentWallpaper}
              onSetWallpaper={() => onSetWallpaper(wallpaper)}
              onToggleFavorite={() => onToggleFavorite(wallpaper.id)}
              onRemove={() => onRemoveWallpaper(wallpaper.path)}
            />
          ))}
        </div>
      )}

      {wallpapers.length > 0 && filteredWallpapers.length === 0 && searchTerm && (
        <div className="empty-state">
          <div className="empty-state__icon">🔍</div>
          <div className="empty-state__title">No results found</div>
          <div className="empty-state__description">
            No wallpapers match &ldquo;{searchTerm}&rdquo;. Try a different search term.
          </div>
        </div>
      )}
    </div>
  )
}

export default Gallery
