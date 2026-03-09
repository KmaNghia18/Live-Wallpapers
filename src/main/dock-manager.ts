/**
 * DockManager - Custom desktop dock overlay
 *
 * Creates a transparent, always-on-top BrowserWindow at the bottom
 * of the screen that shows a custom dock with clock, app shortcuts,
 * and system tray icons. Replaces the Windows taskbar.
 */

import * as electron from 'electron'
import { join } from 'path'
import * as cp from 'child_process'
import { setTaskbarAutoHide } from './native/win32-helper'

export class DockManager {
  private dockWindow: electron.BrowserWindow | null = null
  private isVisible: boolean = false
  private taskbarHidden: boolean = false

  /**
   * Show the custom dock and auto-hide Windows taskbar
   */
  async show(): Promise<void> {
    if (this.dockWindow && !this.dockWindow.isDestroyed()) {
      this.dockWindow.show()
      this.isVisible = true
      return
    }

    const primaryDisplay = electron.screen.getPrimaryDisplay()
    const bounds = primaryDisplay.bounds

    const dockHeight = 80        // Normal dock bar height
    const dockY = bounds.y + bounds.height - dockHeight - 2

    console.log('[DockManager] Creating dock:', { bounds, dockHeight, dockY })

    this.dockWindow = new electron.BrowserWindow({
      x: bounds.x,
      y: dockY,
      width: bounds.width,
      height: dockHeight,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      focusable: true,       // Must be true for buttons to receive click events on Windows
      alwaysOnTop: true,
      hasShadow: false,
      roundedCorners: false,
      show: false,           // Don't show until content is loaded
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    })

    // Keep dock above all windows including fullscreen
    this.dockWindow.setAlwaysOnTop(true, 'screen-saver')

    // Load dock HTML
    const dockHtmlPath = join(__dirname, '../../resources/dock.html')
    console.log('[DockManager] Loading dock from:', dockHtmlPath)
    try {
      await this.dockWindow.loadFile(dockHtmlPath)
      console.log('[DockManager] dock.html loaded successfully')
    } catch (error) {
      console.error('[DockManager] Failed to load dock.html:', error)
      return
    }

    // Explicitly show the window after loading
    this.dockWindow.show()
    this.isVisible = true

    // Window is only 80px tall, so setIgnoreMouseEvents(false) is safe:
    // transparent parts are above the window, not part of it.
    // No dynamic toggle needed — eliminates all flickering/timing issues.
    this.dockWindow.setIgnoreMouseEvents(false)

    // Auto-hide Windows taskbar
    this.hideTaskbar()

    console.log('[DockManager] Dock shown at y:', dockY, 'width:', bounds.width)
  }

  /**
   * Hide the custom dock and restore Windows taskbar
   */
  hide(): void {
    if (this.dockWindow && !this.dockWindow.isDestroyed()) {
      this.dockWindow.hide()
    }
    this.isVisible = false

    // Restore Windows taskbar
    this.showTaskbar()
  }

  /**
   * Toggle dock visibility
   */
  async toggle(): Promise<void> {
    if (this.isVisible) {
      this.hide()
    } else {
      await this.show()
    }
  }

  /**
   * Auto-hide Windows taskbar
   */
  private hideTaskbar(): void {
    if (!this.taskbarHidden) {
      setTaskbarAutoHide(true)
      this.taskbarHidden = true
      console.log('[DockManager] Windows taskbar auto-hidden')
    }
  }

  /**
   * Restore Windows taskbar
   */
  private showTaskbar(): void {
    if (this.taskbarHidden) {
      setTaskbarAutoHide(false)
      this.taskbarHidden = false
      console.log('[DockManager] Windows taskbar restored')
    }
  }

  /**
   * Check if dock is visible
   */
  getIsVisible(): boolean {
    return this.isVisible
  }

  /**
   * Register IPC handlers for dock
   */
  registerIPC(): void {
    electron.ipcMain.handle('dock-toggle', async () => {
      await this.toggle()
      return this.isVisible
    })

    electron.ipcMain.handle('dock-show', async () => {
      await this.show()
      return true
    })

    electron.ipcMain.handle('dock-hide', () => {
      this.hide()
      return true
    })

    electron.ipcMain.handle('dock-status', () => {
      return { isVisible: this.isVisible }
    })

    // Dynamic mouse event toggle for click-through
    // Renderer calls this with true when mouse is over interactive elements
    electron.ipcMain.on('set-dock-mouse-events', (_event, interactive: boolean) => {
      if (this.dockWindow && !this.dockWindow.isDestroyed()) {
        this.dockWindow.setIgnoreMouseEvents(!interactive, { forward: true })
      }
    })

    // Resize dock window for search/playlist overlay
    electron.ipcMain.on('dock-resize', (_event, expanded: boolean) => {
      if (!this.dockWindow || this.dockWindow.isDestroyed()) return
      const primaryDisplay = electron.screen.getPrimaryDisplay()
      const bounds = primaryDisplay.bounds
      const winH = expanded ? 280 : 80
      const y    = bounds.y + bounds.height - winH - 2
      this.dockWindow.setBounds({ x: bounds.x, y, width: bounds.width, height: winH }, false)
    })

    // Persist music playlists to disk (userData/dock-playlists.json)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs   = require('fs') as typeof import('fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path')
    const plFile   = path.join(electron.app.getPath('userData'), 'dock-playlists.json')
    const wpPlFile = path.join(electron.app.getPath('userData'), 'wallpaper-playlists.json')

    electron.ipcMain.handle('dock-playlist-read', async () => {
      try {
        if (!fs.existsSync(plFile)) return null
        return JSON.parse(fs.readFileSync(plFile, 'utf-8'))
      } catch { return null }
    })
    electron.ipcMain.on('dock-playlist-write', (_event, data: unknown) => {
      try { fs.writeFileSync(plFile, JSON.stringify(data), 'utf-8') } catch {}
    })

    // Persist wallpaper playlists to disk (userData/wallpaper-playlists.json)
    electron.ipcMain.handle('wp-playlist-read', async () => {
      try {
        if (!fs.existsSync(wpPlFile)) return null
        return JSON.parse(fs.readFileSync(wpPlFile, 'utf-8'))
      } catch { return null }
    })
    electron.ipcMain.on('wp-playlist-write', (_event, data: unknown) => {
      try { fs.writeFileSync(wpPlFile, JSON.stringify(data), 'utf-8') } catch {}
    })

    // Open file dialog for music player (multi-select)
    electron.ipcMain.handle('dock-open-audio', async () => {
      const result = await electron.dialog.showOpenDialog({
        title: 'Choose audio files',
        filters: [{ name: 'Audio', extensions: ['mp3','ogg','wav','flac','m4a','aac','opus','wma'] }],
        properties: ['openFile', 'multiSelections']
      })
      return result.canceled ? null : result.filePaths
    })

    // App launcher from dock
    electron.ipcMain.handle('launch-app', (_event, appId: string) => {
      this.launchApp(appId)
      return true
    })
  }

  /**
   * Launch common apps from dock
   */
  private launchApp(appId: string): void {
    const appCommands: Record<string, string> = {
      explorer: 'explorer.exe',
      browser: 'start "" "shell:AppsFolder\\Microsoft.MicrosoftEdge_8wekyb3d8bbwe!MicrosoftEdge"',
      terminal: 'wt.exe',
      settings: 'start ms-settings:',
      notepad: 'notepad.exe',
      calculator: 'calc.exe',
      store: 'start ms-windows-store:',
      vscode: 'code',
      paint: 'mspaint.exe',
      taskmanager: 'taskmgr.exe'
    }

    const cmd = appCommands[appId]
    if (cmd) {
      cp.exec(cmd, (error) => {
        if (error) {
          // Fallback for browser
          if (appId === 'browser') {
            cp.exec('start "" "https://www.google.com"')
          }
          console.error(`[DockManager] Failed to launch ${appId}:`, error)
        }
      })
    }
  }

  /**
   * Destroy dock and restore taskbar
   */
  destroy(): void {
    this.showTaskbar()
    if (this.dockWindow && !this.dockWindow.isDestroyed()) {
      this.dockWindow.close()
    }
    this.dockWindow = null
    this.isVisible = false
  }
}
