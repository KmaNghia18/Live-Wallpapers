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
  // Screensaver settings
  screensaverEnabled: boolean
  screensaverIdleMinutes: number
  screensaverUseCurrentWallpaper: boolean
  screensaverWallpaper: string | null
  // Hotkey settings
  hotkeyNext: string
  hotkeyPlayPause: string
}

export interface WallpaperItem {
  id: string
  name: string
  path: string
  thumbnail: string
  type: 'video' | 'gif' | 'image' | 'web' | 'shader'
  resolution: string
  duration?: number // optional — only for video
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
  language: 'en',
  screensaverEnabled: false,
  screensaverIdleMinutes: 10,
  screensaverUseCurrentWallpaper: true,
  screensaverWallpaper: null,
  hotkeyNext: 'Ctrl+Alt+N',
  hotkeyPlayPause: 'Ctrl+Alt+P'
}

export class SettingsStore {
  private store: Store<StoreSchema>

  constructor() {
    this.store = new Store<StoreSchema>({
      name: 'live-wallpaper-settings',
      defaults
    })
  }

  get<K extends keyof StoreSchema>(key: K): StoreSchema[K]
  get<K extends keyof StoreSchema>(key: K, defaultValue: StoreSchema[K]): StoreSchema[K]
  get(key: string, defaultValue?: unknown): unknown {
    return this.store.get(key as keyof StoreSchema, defaultValue as any)
  }

  set<K extends keyof StoreSchema>(key: K, value: StoreSchema[K]): void
  set(key: string, value: unknown): void {
    this.store.set(key as keyof StoreSchema, value as any)
  }

  getAll(): StoreSchema {
    return this.store.store
  }

  reset(): void {
    this.store.clear()
  }

  /**
   * Delete a specific key from the store
   */
  delete(key: keyof StoreSchema): void {
    this.store.delete(key)
  }

  /**
   * Check if a key exists
   */
  has(key: keyof StoreSchema): boolean {
    return this.store.has(key)
  }
}
