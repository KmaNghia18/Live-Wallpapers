import { BrowserWindow } from 'electron'
import { join } from 'path'
import { MonitorInfo } from './monitor-detector'
import { getWorkerWHandle, setParentToWorkerW, spawnWorkerW } from './native/win32-helper'

/**
 * WallpaperEngine - Core engine that renders video wallpapers behind desktop icons.
 *
 * Uses the Windows WorkerW technique:
 * 1. Find Progman window (manages desktop)
 * 2. Send message 0x052C to spawn a WorkerW window
 * 3. Find WorkerW behind SHELLDLL_DefView
 * 4. Set our BrowserWindow as child of that WorkerW
 */
export class WallpaperEngine {
  private wallpaperWindows: Map<number, BrowserWindow> = new Map()
  private _isPlaying: boolean = false
  private currentWallpaper: string | null = null
  private workerWHandle: number = 0

  async setWallpaper(wallpaperPath: string, monitor: MonitorInfo): Promise<void> {
    // Destroy existing wallpaper window for this monitor
    const existing = this.wallpaperWindows.get(monitor.id)
    if (existing && !existing.isDestroyed()) {
      existing.close()
    }

    const { x, y, width, height } = monitor.bounds

    const wallpaperWindow = new BrowserWindow({
      x,
      y,
      width,
      height,
      frame: false,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      focusable: false,
      transparent: false,
      hasShadow: false,
      type: 'desktop',
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        // Allow loading local file:// videos
        webSecurity: false
      }
    })

    wallpaperWindow.setSkipTaskbar(true)

    // Load the self-contained wallpaper.html from resources/
    const wallpaperHtmlPath = join(__dirname, '../../resources/wallpaper.html')
    console.log('[WallpaperEngine] Loading wallpaper HTML from:', wallpaperHtmlPath)

    try {
      await wallpaperWindow.loadFile(wallpaperHtmlPath)
    } catch (error) {
      console.error('[WallpaperEngine] Failed to load wallpaper.html:', error)
      // Fallback: try from out/renderer if it exists
      try {
        await wallpaperWindow.loadFile(join(__dirname, '../renderer/wallpaper.html'))
      } catch {
        console.error('[WallpaperEngine] All wallpaper.html paths failed')
        return
      }
    }

    // Wait for the renderer to signal readiness
    await this.waitForRendererReady(wallpaperWindow)

    // Now send wallpaper data to renderer
    const wallpaperType = this.getWallpaperType(wallpaperPath)
    console.log('[WallpaperEngine] Sending wallpaper:', wallpaperPath, 'type:', wallpaperType)

    wallpaperWindow.webContents.send('load-wallpaper', {
      path: wallpaperPath,
      width,
      height,
      type: wallpaperType
    })

    wallpaperWindow.show()

    // Try to embed behind desktop icons using WorkerW technique
    this.tryEmbedBehindIcons(wallpaperWindow)

    this.wallpaperWindows.set(monitor.id, wallpaperWindow)
    this.currentWallpaper = wallpaperPath
    this._isPlaying = true
  }

  /**
   * Wait for wallpaper renderer to set up IPC listeners.
   * The renderer sets document.title = 'WALLPAPER_READY' when ready.
   */
  private waitForRendererReady(window: BrowserWindow): Promise<void> {
    return new Promise<void>((resolve) => {
      let checkCount = 0
      const maxChecks = 50 // 5 seconds max wait

      const check = (): void => {
        checkCount++
        if (window.isDestroyed()) {
          resolve()
          return
        }

        const title = window.getTitle()
        if (title === 'WALLPAPER_READY' || checkCount >= maxChecks) {
          if (checkCount >= maxChecks) {
            console.warn('[WallpaperEngine] Renderer readiness timeout, proceeding anyway')
          } else {
            console.log('[WallpaperEngine] Renderer ready after', checkCount * 100, 'ms')
          }
          resolve()
          return
        }

        setTimeout(check, 100)
      }

      // Give initial 200ms for DOM to load
      setTimeout(check, 200)
    })
  }

  /**
   * Embed the wallpaper window behind desktop icons using WorkerW technique.
   */
  private tryEmbedBehindIcons(window: BrowserWindow): void {
    try {
      if (this.workerWHandle === 0) {
        spawnWorkerW()
        this.workerWHandle = getWorkerWHandle()
      }

      if (this.workerWHandle !== 0) {
        const nativeHandle = window.getNativeWindowHandle()
        const hwnd = nativeHandle.readUInt32LE(0)
        const success = setParentToWorkerW(hwnd, this.workerWHandle)
        if (success) {
          console.log('[WallpaperEngine] Embedded wallpaper behind desktop icons')
        } else {
          console.warn('[WallpaperEngine] setParentToWorkerW failed, using desktop type')
          window.setAlwaysOnTop(false)
        }
      } else {
        console.warn('[WallpaperEngine] WorkerW handle not found, using desktop type')
        window.setAlwaysOnTop(false)
      }
    } catch (error) {
      console.error('[WallpaperEngine] Failed to embed:', error)
      window.setAlwaysOnTop(false)
    }
  }

  private getWallpaperType(path: string): string {
    const ext = path.toLowerCase().split('.').pop() || ''
    if (['mp4', 'webm', 'mkv', 'avi', 'mov'].includes(ext)) return 'video'
    if (['gif'].includes(ext)) return 'gif'
    if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(ext)) return 'image'
    if (['html', 'htm'].includes(ext)) return 'web'
    if (['glsl', 'frag'].includes(ext)) return 'shader'
    return 'video'
  }

  pause(): void {
    this._isPlaying = false
    this.wallpaperWindows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('wallpaper-control', 'pause')
      }
    })
  }

  play(): void {
    this._isPlaying = true
    this.wallpaperWindows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('wallpaper-control', 'play')
      }
    })
  }

  isPlaying(): boolean {
    return this._isPlaying
  }

  getCurrentWallpaper(): string | null {
    return this.currentWallpaper
  }

  destroy(): void {
    this.wallpaperWindows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.close()
      }
    })
    this.wallpaperWindows.clear()
    this._isPlaying = false
  }
}
