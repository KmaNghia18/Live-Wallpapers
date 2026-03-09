import { BrowserWindow, screen } from 'electron'
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

  constructor() {
    // Listen for display metric changes (e.g. taskbar auto-hide toggled)
    screen.on('display-metrics-changed', this.handleMetricsChanged)
  }

  private handleMetricsChanged = (_event: Electron.Event, display: Electron.Display, changedMetrics: string[]): void => {
    // If working area or bounds changed (often due to taskbar toggle)
    if (changedMetrics.includes('workArea') || changedMetrics.includes('bounds')) {
      const window = this.wallpaperWindows.get(display.id)
      if (window && !window.isDestroyed()) {
        const { x, y } = display.bounds
        const { width, height } = display.size
        window.setBounds({ x, y, width, height })
        
        // Notify renderer of new size
        window.webContents.send('load-wallpaper', {
          path: this.currentWallpaper,
          width,
          height,
          type: this.currentWallpaper ? this.getWallpaperType(this.currentWallpaper) : 'video'
        })
      }
    }
  }

  async setWallpaper(wallpaperPath: string, monitor: MonitorInfo): Promise<void> {
    const wallpaperType = this.getWallpaperType(wallpaperPath)
    const { x, y } = monitor.bounds
    const { width, height } = monitor.size

    // ── Reuse existing window if possible (avoids flash from close+recreate) ──
    const existing = this.wallpaperWindows.get(monitor.id)
    if (existing && !existing.isDestroyed()) {
      // Just send new wallpaper to the running HTML — crossfade happens in renderer
      existing.webContents.send('load-wallpaper', {
        path: wallpaperPath,
        width,
        height,
        type: wallpaperType,
      })
      this.currentWallpaper = wallpaperPath
      this._isPlaying = true
      return
    }

    // ── First time: create the wallpaper window ──
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
      backgroundColor: '#000000',
      type: 'desktop',
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false,
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
      try {
        await wallpaperWindow.loadFile(join(__dirname, '../renderer/wallpaper.html'))
      } catch {
        console.error('[WallpaperEngine] All wallpaper.html paths failed')
        return
      }
    }

    // Wait for the renderer to signal readiness
    await this.waitForRendererReady(wallpaperWindow)

    // Send wallpaper data to renderer
    console.log('[WallpaperEngine] Sending wallpaper:', wallpaperPath, 'type:', wallpaperType)
    wallpaperWindow.webContents.send('load-wallpaper', {
      path: wallpaperPath,
      width,
      height,
      type: wallpaperType,
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
    screen.removeListener('display-metrics-changed', this.handleMetricsChanged)
  }
}
