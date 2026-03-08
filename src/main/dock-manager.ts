/**
 * DockManager - Custom desktop dock overlay
 *
 * Creates a transparent, always-on-top BrowserWindow at the bottom
 * of the screen that shows a custom dock with clock, app shortcuts,
 * and system tray icons. Replaces the Windows taskbar.
 */

import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { exec } from 'child_process'
import { setTaskbarAutoHide } from './native/win32-helper'

export class DockManager {
  private dockWindow: BrowserWindow | null = null
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

    const primaryDisplay = screen.getPrimaryDisplay()
    const bounds = primaryDisplay.bounds

    const dockHeight = 80
    const dockY = bounds.y + bounds.height - dockHeight - 6

    console.log('[DockManager] Creating dock:', { bounds, dockHeight, dockY })

    this.dockWindow = new BrowserWindow({
      x: bounds.x,
      y: dockY,
      width: bounds.width,
      height: dockHeight,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      focusable: false,
      alwaysOnTop: true,
      hasShadow: false,
      type: 'toolbar',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    // Make click-through on transparent areas
    this.dockWindow.setIgnoreMouseEvents(false)

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

    this.isVisible = true

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
  toggle(): void {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show()
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
    ipcMain.handle('dock-toggle', () => {
      this.toggle()
      return this.isVisible
    })

    ipcMain.handle('dock-show', async () => {
      await this.show()
      return true
    })

    ipcMain.handle('dock-hide', () => {
      this.hide()
      return true
    })

    ipcMain.handle('dock-status', () => {
      return { isVisible: this.isVisible }
    })

    // App launcher from dock
    ipcMain.handle('launch-app', (_event, appId: string) => {
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
      store: 'start ms-windows-store:'
    }

    const cmd = appCommands[appId]
    if (cmd) {
      exec(cmd, (error) => {
        if (error) {
          // Fallback for browser
          if (appId === 'browser') {
            exec('start "" "https://www.google.com"')
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
