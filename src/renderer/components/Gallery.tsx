import { useState, useRef, useCallback } from 'react'
import WallpaperCard from './WallpaperCard'
import { WallpaperItem } from '../App'
import { IconSearch, IconPlus, IconFolder } from './Icons'

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

const filterChips = [
  { id: 'all', label: 'All' },
  { id: 'video', label: 'Video' },
  { id: 'gif', label: 'GIF' },
  { id: 'image', label: 'Image' },
  { id: 'shader', label: 'Shader' }
]

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
  const [filterType, setFilterType] = useState('all')
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
    onAddWallpapers()
  }, [onAddWallpapers])

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">{title}</h1>
          <p className="page-header__subtitle">{subtitle} • {wallpapers.length} items</p>
        </div>
        <div className="page-header__actions">
          <div className="search-box">
            <IconSearch size={16} className="search-box__icon" />
            <input
              type="text"
              placeholder="Search wallpapers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="search-box__input"
            />
          </div>
          <button className="btn btn--primary" onClick={onAddWallpapers}>
            <IconPlus size={16} />
            Add Wallpaper
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="filter-chips">
        {filterChips.map(chip => (
          <button
            key={chip.id}
            className={`filter-chip ${filterType === chip.id ? 'filter-chip--active' : ''}`}
            onClick={() => setFilterType(chip.id)}
          >
            {chip.label}
            {chip.id !== 'all' && (
              <span className="filter-chip__count">
                {wallpapers.filter(w => w.type === chip.id).length}
              </span>
            )}
          </button>
        ))}
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
          <div className="drop-zone__icon-wrap">
            <IconFolder size={48} />
          </div>
          <div className="drop-zone__text">
            Drop video files here or click to browse
          </div>
          <div className="drop-zone__hint">
            Supports: MP4, WebM, MKV, AVI, MOV, GIF, PNG, JPG
          </div>
          <button className="btn btn--primary" style={{ marginTop: '16px' }}>
            <IconPlus size={16} />
            Browse Files
          </button>
        </div>
      ) : (
        <div
          className="gallery"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Add new card */}
          <div className="wallpaper-card wallpaper-card--add" onClick={onAddWallpapers}>
            <div className="wallpaper-card__add-content">
              <div className="wallpaper-card__add-icon">
                <IconPlus size={28} />
              </div>
              <span>Add Wallpaper</span>
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
          <div className="empty-state__icon"><IconSearch size={48} /></div>
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
