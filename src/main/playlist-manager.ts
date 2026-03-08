/**
 * Playlist Manager
 *
 * Manages wallpaper playlists with various rotation modes:
 * - Sequential: play in order
 * - Random: random selection
 * - Timer: change every X minutes
 * - Time-of-day: different wallpaper for morning/afternoon/evening/night
 */

export interface PlaylistItem {
  wallpaperPath: string
  wallpaperName: string
  duration?: number // seconds to show this wallpaper (0 = until next trigger)
}

export interface Playlist {
  id: string
  name: string
  items: PlaylistItem[]
  mode: 'sequential' | 'random' | 'time-of-day'
  timerMinutes: number // interval in minutes for auto-change
  isActive: boolean
  currentIndex: number
}

export interface TimeOfDayConfig {
  morning: string   // 6:00 - 12:00
  afternoon: string // 12:00 - 17:00
  evening: string   // 17:00 - 21:00
  night: string     // 21:00 - 6:00
}

type PlaylistCallback = (wallpaperPath: string) => void

export class PlaylistManager {
  private playlists: Map<string, Playlist> = new Map()
  private activePlaylistId: string | null = null
  private timer: NodeJS.Timeout | null = null
  private callback: PlaylistCallback | null = null

  setCallback(callback: PlaylistCallback): void {
    this.callback = callback
  }

  createPlaylist(name: string, mode: Playlist['mode'] = 'sequential'): Playlist {
    const playlist: Playlist = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name,
      items: [],
      mode,
      timerMinutes: 30,
      isActive: false,
      currentIndex: 0
    }
    this.playlists.set(playlist.id, playlist)
    return playlist
  }

  addToPlaylist(playlistId: string, item: PlaylistItem): void {
    const playlist = this.playlists.get(playlistId)
    if (playlist) {
      playlist.items.push(item)
    }
  }

  removeFromPlaylist(playlistId: string, index: number): void {
    const playlist = this.playlists.get(playlistId)
    if (playlist && index >= 0 && index < playlist.items.length) {
      playlist.items.splice(index, 1)
      if (playlist.currentIndex >= playlist.items.length) {
        playlist.currentIndex = 0
      }
    }
  }

  startPlaylist(playlistId: string): void {
    const playlist = this.playlists.get(playlistId)
    if (!playlist || playlist.items.length === 0) return

    // Stop any existing playlist
    this.stopPlaylist()

    playlist.isActive = true
    this.activePlaylistId = playlistId

    // Play current item
    this.playCurrentItem()

    // Set timer for auto-change
    if (playlist.timerMinutes > 0) {
      this.timer = setInterval(() => {
        this.next()
      }, playlist.timerMinutes * 60 * 1000)
    }
  }

  stopPlaylist(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    if (this.activePlaylistId) {
      const playlist = this.playlists.get(this.activePlaylistId)
      if (playlist) {
        playlist.isActive = false
      }
      this.activePlaylistId = null
    }
  }

  next(): void {
    if (!this.activePlaylistId) return
    const playlist = this.playlists.get(this.activePlaylistId)
    if (!playlist || playlist.items.length === 0) return

    if (playlist.mode === 'random') {
      let newIndex: number
      do {
        newIndex = Math.floor(Math.random() * playlist.items.length)
      } while (newIndex === playlist.currentIndex && playlist.items.length > 1)
      playlist.currentIndex = newIndex
    } else {
      playlist.currentIndex = (playlist.currentIndex + 1) % playlist.items.length
    }

    this.playCurrentItem()
  }

  previous(): void {
    if (!this.activePlaylistId) return
    const playlist = this.playlists.get(this.activePlaylistId)
    if (!playlist || playlist.items.length === 0) return

    playlist.currentIndex = playlist.currentIndex === 0
      ? playlist.items.length - 1
      : playlist.currentIndex - 1

    this.playCurrentItem()
  }

  private playCurrentItem(): void {
    if (!this.activePlaylistId) return
    const playlist = this.playlists.get(this.activePlaylistId)
    if (!playlist || playlist.items.length === 0) return

    const item = playlist.items[playlist.currentIndex]
    if (item && this.callback) {
      this.callback(item.wallpaperPath)
    }
  }

  /**
   * Get wallpaper based on time of day
   */
  getTimeOfDayWallpaper(config: TimeOfDayConfig): string | null {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) return config.morning
    if (hour >= 12 && hour < 17) return config.afternoon
    if (hour >= 17 && hour < 21) return config.evening
    return config.night
  }

  getPlaylist(id: string): Playlist | undefined {
    return this.playlists.get(id)
  }

  getAllPlaylists(): Playlist[] {
    return Array.from(this.playlists.values())
  }

  deletePlaylist(id: string): void {
    if (this.activePlaylistId === id) {
      this.stopPlaylist()
    }
    this.playlists.delete(id)
  }

  setTimer(playlistId: string, minutes: number): void {
    const playlist = this.playlists.get(playlistId)
    if (playlist) {
      playlist.timerMinutes = minutes

      // Restart timer if this playlist is active
      if (this.activePlaylistId === playlistId && this.timer) {
        clearInterval(this.timer)
        this.timer = setInterval(() => {
          this.next()
        }, minutes * 60 * 1000)
      }
    }
  }

  destroy(): void {
    this.stopPlaylist()
    this.playlists.clear()
    this.callback = null
  }
}
