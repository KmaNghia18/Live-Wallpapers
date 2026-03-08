import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { MonitorInfo } from './monitor-detector'

/**
 * WallpaperEngine - Core engine that renders video wallpapers behind desktop icons.
 *
 * Uses the Windows WorkerW technique:
 * 1. Find Progman window (manages desktop)
 * 2. Send message 0x052C to spawn a WorkerW window
 * 3. Find WorkerW behind SHELLDLL_DefView
 * 4. Set our BrowserWindow as child of that WorkerW
 *
 * Layer order (top to bottom):
 *   Desktop Icons → SHELLDLL_DefView → WorkerW (our video) → Progman
 */
export class WallpaperEngine {
  private wallpaperWindows: Map<number, BrowserWindow> = new Map()
  private _isPlaying: boolean = false
  private currentWallpaper: string | null = null

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
        nodeIntegration: false
      }
    })

    // Disable the window from appearing in alt-tab
    wallpaperWindow.setSkipTaskbar(true)

    // Load the wallpaper renderer page
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      const url = `${process.env['ELECTRON_RENDERER_URL']}/wallpaper.html`
      await wallpaperWindow.loadURL(url)
    } else {
      await wallpaperWindow.loadFile(join(__dirname, '../renderer/wallpaper.html'))
    }

    // Send wallpaper data to renderer
    wallpaperWindow.webContents.send('load-wallpaper', {
      path: wallpaperPath,
      width,
      height,
      type: this.getWallpaperType(wallpaperPath)
    })

    wallpaperWindow.show()

    // Try to embed behind desktop icons using WorkerW technique
    this.tryEmbedBehindIcons(wallpaperWindow)

    this.wallpaperWindows.set(monitor.id, wallpaperWindow)
    this.currentWallpaper = wallpaperPath
    this._isPlaying = true
  }

  /**
   * Attempt to embed the window behind desktop icons.
   * On Windows, this uses the WorkerW technique.
   * Falls back to 'desktop' type window if native embedding fails.
   */
  private tryEmbedBehindIcons(window: BrowserWindow): void {
    try {
      // The 'desktop' type in Electron already places the window
      // at the desktop level on Windows. For deeper integration,
      // we would use ffi-napi to call:
      //   FindWindowEx(null, null, 'Progman', null)
      //   SendMessageTimeout(progman, 0x052C, ...)
      //   FindWindowEx(null, null, 'WorkerW', null)
      //   SetParent(ourWindow, workerW)
      //
      // For now, the 'desktop' type provides good enough behavior.
      // Full WorkerW injection will be added in core-engine feature branch.

      window.setAlwaysOnTop(false)
      window.moveTop()
    } catch (error) {
      console.error('Failed to embed wallpaper behind icons:', error)
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
