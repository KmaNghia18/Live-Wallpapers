import { useRef } from 'react'
import { WallpaperItem } from '../App'
import { IconHeartFilled, IconHeart, IconTrash, IconPlay, TypeIcon } from './Icons'

interface WallpaperCardProps {
  wallpaper: WallpaperItem
  isActive: boolean
  onSetWallpaper: () => void
  onToggleFavorite: () => void
  onRemove: () => void
}

function WallpaperCard({
  wallpaper,
  isActive,
  onSetWallpaper,
  onToggleFavorite,
  onRemove
}: WallpaperCardProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleMouseEnter = (): void => {
    if (videoRef.current && wallpaper.type === 'video') {
      videoRef.current.play().catch(() => {})
    }
  }

  const handleMouseLeave = (): void => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  const getResolutionBadgeClass = (): string => {
    const res = wallpaper.resolution?.toUpperCase() || ''
    if (res.includes('4K')) return 'wallpaper-card__badge--4k'
    if (res.includes('2K')) return 'wallpaper-card__badge--2k'
    return 'wallpaper-card__badge--fhd'
  }

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return ''
    const mb = bytes / (1024 * 1024)
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
  }

  return (
    <div
      className={`wallpaper-card ${isActive ? 'wallpaper-card--active' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={onSetWallpaper}
    >
      <div className="wallpaper-card__preview">
        {wallpaper.type === 'video' ? (
          <video
            ref={videoRef}
            src={`file://${wallpaper.path}`}
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          <img
            src={wallpaper.type === 'image' || wallpaper.type === 'gif'
              ? `file://${wallpaper.path}`
              : `file://${wallpaper.thumbnail}`}
            alt={wallpaper.name}
            loading="lazy"
          />
        )}

        {/* Hover Overlay */}
        <div className="wallpaper-card__overlay">
          <button
            className="wallpaper-card__play-btn"
            onClick={(e) => {
              e.stopPropagation()
              onSetWallpaper()
            }}
            title="Set as wallpaper"
          >
            <IconPlay size={22} />
          </button>
        </div>

        {/* Resolution Badge */}
        {wallpaper.resolution && (
          <div className={`wallpaper-card__badge ${getResolutionBadgeClass()}`}>
            {wallpaper.resolution}
          </div>
        )}

        {/* Favorite Button */}
        <button
          className={`wallpaper-card__favorite ${wallpaper.favorite ? 'wallpaper-card__favorite--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          title={wallpaper.favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {wallpaper.favorite ? <IconHeartFilled size={14} /> : <IconHeart size={14} />}
        </button>

        {/* Remove Button */}
        <button
          className="wallpaper-card__remove"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          title="Remove from library"
        >
          <IconTrash size={14} />
        </button>

        {/* Active Indicator */}
        {isActive && (
          <div className="wallpaper-card__active-indicator">
            <div className="wallpaper-card__active-badge">
              <span className="wallpaper-card__active-dot" />
              NOW PLAYING
            </div>
          </div>
        )}
      </div>

      <div className="wallpaper-card__info">
        <div className="wallpaper-card__name">{wallpaper.name}</div>
        <div className="wallpaper-card__meta">
          <span className="wallpaper-card__type-badge">
            <TypeIcon type={wallpaper.type} size={12} />
            {wallpaper.type.toUpperCase()}
          </span>
          {wallpaper.size > 0 && <span>{formatSize(wallpaper.size)}</span>}
          {wallpaper.category && <span>{wallpaper.category}</span>}
        </div>
      </div>
    </div>
  )
}

export default WallpaperCard
