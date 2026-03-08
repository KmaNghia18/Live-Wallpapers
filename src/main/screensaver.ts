/**
 * Screensaver Integration
 *
 * Uses the current wallpaper or a dedicated wallpaper as a screensaver.
 * Features: fade-in animation, grace period, idle detection.
 */

import { BrowserWindow, powerMonitor, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

export interface ScreensaverConfig {
  enabled: boolean
  idleTimeoutMinutes: number
  fadeInDurationMs: number
  gracePeriodMs: number // time after mouse move before deactivating
  useCurrentWallpaper: boolean
  dedicatedWallpaper: string | null
}

const DEFAULT_CONFIG: ScreensaverConfig = {
  enabled: false,
  idleTimeoutMinutes: 10,
  fadeInDurationMs: 1500,
  gracePeriodMs: 3000,
  useCurrentWallpaper: true,
  dedicatedWallpaper: null
}

export class ScreensaverManager {
  private config: ScreensaverConfig = { ...DEFAULT_CONFIG }
  private screensaverWindow: BrowserWindow | null = null
  private idleCheckInterval: NodeJS.Timeout | null = null
  private isActive: boolean = false
  private onActivate: (() => void) | null = null
  private onDeactivate: (() => void) | null = null

  setConfig(config: Partial<ScreensaverConfig>): void {
    this.config = { ...this.config, ...config }
  }

  onScreensaverActivate(callback: () => void): void {
    this.onActivate = callback
  }

  onScreensaverDeactivate(callback: () => void): void {
    this.onDeactivate = callback
  }

  start(): void {
    if (!this.config.enabled) return
    this.stop()

    // Check system idle time every 30 seconds
    this.idleCheckInterval = setInterval(() => {
      const idleSeconds = powerMonitor.getSystemIdleTime()
      const thresholdSeconds = this.config.idleTimeoutMinutes * 60

      if (idleSeconds >= thresholdSeconds && !this.isActive) {
        this.activate()
      }
    }, 30000)
  }

  stop(): void {
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval)
      this.idleCheckInterval = null
    }
    this.deactivate()
  }

  private activate(): void {
    if (this.isActive) return
    this.isActive = true

    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    this.screensaverWindow = new BrowserWindow({
      width,
      height,
      x: 0,
      y: 0,
      fullscreen: true,
      frame: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      transparent: true,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true
      }
    })

    // Load screensaver page
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.screensaverWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/wallpaper.html`)
    } else {
      this.screensaverWindow.loadFile(join(__dirname, '../renderer/wallpaper.html'))
    }

    this.screensaverWindow.once('ready-to-show', () => {
      this.screensaverWindow?.show()
      this.screensaverWindow?.setOpacity(0)

      // Fade in animation
      let opacity = 0
      const fadeStep = 16 / this.config.fadeInDurationMs
      const fadeInterval = setInterval(() => {
        opacity += fadeStep
        if (opacity >= 1) {
          opacity = 1
          clearInterval(fadeInterval)
        }
        try {
          this.screensaverWindow?.setOpacity(opacity)
        } catch {
          clearInterval(fadeInterval)
        }
      }, 16)
    })

    // Deactivate on any input after grace period
    let graceTimeout: NodeJS.Timeout | null = null
    const handleInput = (): void => {
      if (graceTimeout) return
      graceTimeout = setTimeout(() => {
        this.deactivate()
      }, this.config.gracePeriodMs)
    }

    this.screensaverWindow.on('blur', handleInput)

    // Send wallpaper to screensaver window
    const wallpaperPath = this.config.useCurrentWallpaper
      ? null // will use current wallpaper from engine
      : this.config.dedicatedWallpaper

    if (wallpaperPath) {
      this.screensaverWindow.webContents.on('did-finish-load', () => {
        this.screensaverWindow?.webContents.send('load-wallpaper', {
          path: wallpaperPath,
          width,
          height,
          type: 'video'
        })
      })
    }

    this.onActivate?.()
  }

  private deactivate(): void {
    if (!this.isActive) return
    this.isActive = false

    if (this.screensaverWindow && !this.screensaverWindow.isDestroyed()) {
      // Fade out
      let opacity = 1
      const fadeInterval = setInterval(() => {
        opacity -= 0.05
        if (opacity <= 0) {
          clearInterval(fadeInterval)
          try {
            this.screensaverWindow?.close()
          } catch { /* already closed */ }
          this.screensaverWindow = null
        } else {
          try {
            this.screensaverWindow?.setOpacity(opacity)
          } catch {
            clearInterval(fadeInterval)
          }
        }
      }, 16)
    }

    this.onDeactivate?.()
  }

  isScreensaverActive(): boolean {
    return this.isActive
  }

  destroy(): void {
    this.stop()
    this.onActivate = null
    this.onDeactivate = null
  }
}
