import { useState } from 'react'
import { WallpaperItem } from '../App'
import {
  IconPlay, IconPause, IconSkipNext, IconSkipPrev,
  IconVolume, IconVolumeMute, TypeIcon
} from './Icons'

interface NowPlayingBarProps {
  currentWallpaper: WallpaperItem | null
  isPlaying: boolean
  onTogglePlay: () => void
  onNext: () => void
  onPrevious: () => void
}

function NowPlayingBar({
  currentWallpaper,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrevious
}: NowPlayingBarProps): JSX.Element | null {
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)

  if (!currentWallpaper) {
    return (
      <div className="now-playing-bar now-playing-bar--empty">
        <div className="now-playing-bar__left">
          <div className="now-playing-bar__placeholder">
            <div className="now-playing-bar__placeholder-icon">🎬</div>
          </div>
          <div className="now-playing-bar__info">
            <div className="now-playing-bar__title now-playing-bar__title--muted">
              No wallpaper selected
            </div>
            <div className="now-playing-bar__subtitle">
              Choose a wallpaper from the gallery
            </div>
          </div>
        </div>
      </div>
    )
  }

  const thumbnailUrl = currentWallpaper.type === 'video'
    ? `file://${currentWallpaper.thumbnail || currentWallpaper.path}`
    : `file://${currentWallpaper.path}`

  return (
    <div className="now-playing-bar">
      {/* Left: Thumbnail + Info */}
      <div className="now-playing-bar__left">
        <div className="now-playing-bar__thumbnail">
          {currentWallpaper.type === 'video' ? (
            <video src={thumbnailUrl} muted loop autoPlay playsInline />
          ) : (
            <img src={thumbnailUrl} alt={currentWallpaper.name} />
          )}
          <div className="now-playing-bar__thumbnail-overlay">
            <TypeIcon type={currentWallpaper.type} size={12} />
          </div>
        </div>
        <div className="now-playing-bar__info">
          <div className="now-playing-bar__title">{currentWallpaper.name}</div>
          <div className="now-playing-bar__subtitle">
            {currentWallpaper.type.toUpperCase()}
            {currentWallpaper.resolution && ` • ${currentWallpaper.resolution}`}
          </div>
        </div>
      </div>

      {/* Center: Playback Controls */}
      <div className="now-playing-bar__center">
        <button
          className="now-playing-bar__ctrl-btn"
          onClick={onPrevious}
          title="Previous"
        >
          <IconSkipPrev size={16} />
        </button>
        <button
          className="now-playing-bar__ctrl-btn now-playing-bar__ctrl-btn--play"
          onClick={onTogglePlay}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <IconPause size={18} /> : <IconPlay size={18} />}
        </button>
        <button
          className="now-playing-bar__ctrl-btn"
          onClick={onNext}
          title="Next"
        >
          <IconSkipNext size={16} />
        </button>
      </div>

      {/* Right: Volume */}
      <div className="now-playing-bar__right">
        <button
          className="now-playing-bar__vol-btn"
          onClick={() => setIsMuted(!isMuted)}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted || volume === 0 ? <IconVolumeMute size={16} /> : <IconVolume size={16} />}
        </button>
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={e => setVolume(Number(e.target.value))}
          className="now-playing-bar__volume-slider"
          title={`Volume: ${isMuted ? 0 : volume}%`}
        />
      </div>

      {/* Animated playing indicator line at top */}
      {isPlaying && <div className="now-playing-bar__playing-line" />}
    </div>
  )
}

export default NowPlayingBar
