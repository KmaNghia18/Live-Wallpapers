import Store from 'electron-store'

interface StoreSchema {
  currentWallpaper: string | null
  wallpaperLibrary: WallpaperItem[]
  minimizeToTray: boolean
  autoStart: boolean
  videoQuality: 'auto' | '4k' | '2k' | 'fhd' | 'hd'
  fpsLimit: number
  wallpaperVolume: number
  wallpaperMuted: boolean
  pauseOnFullscreen: boolean
  pauseOnBattery: boolean
  theme: 'dark' | 'light' | 'system'
  language: string
}

export interface WallpaperItem {
  id: string
  name: string
  path: string
  thumbnail: string
  type: 'video' | 'gif' | 'image' | 'web' | 'shader'
  resolution: string
  duration: number
  size: number
  category: string
  favorite: boolean
  dateAdded: string
}

const defaults: StoreSchema = {
  currentWallpaper: null,
  wallpaperLibrary: [],
  minimizeToTray: true,
  autoStart: false,
  videoQuality: 'auto',
  fpsLimit: 30,
  wallpaperVolume: 50,
  wallpaperMuted: true,
  pauseOnFullscreen: true,
  pauseOnBattery: true,
  theme: 'dark',
  language: 'en'
}

export class SettingsStore {
  private store: Store

  constructor() {
    this.store = new Store({
      name: 'live-wallpaper-settings',
      defaults
    })
  }

  get(key: string, defaultValue?: unknown): unknown {
    return this.store.get(key, defaultValue)
  }

  set(key: string, value: unknown): void {
    this.store.set(key, value)
  }

  getAll(): Record<string, unknown> {
    return this.store.store as unknown as Record<string, unknown>
  }

  reset(): void {
    this.store.clear()
  }
}
