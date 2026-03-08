/**
 * Performance Manager
 *
 * Monitors system state and auto-adjusts wallpaper behavior:
 * - Pauses when fullscreen app is detected
 * - Reduces quality when on battery
 * - Pauses when screen is locked/off
 */

import { powerMonitor } from 'electron'
import { isFullscreenAppRunning, isOnBattery } from './native/win32-helper'

export interface PerformanceState {
  isFullscreenAppActive: boolean
  isOnBattery: boolean
  isScreenLocked: boolean
  shouldPause: boolean
  shouldReduceQuality: boolean
}

type PerformanceCallback = (state: PerformanceState) => void

export class PerformanceManager {
  private checkInterval: NodeJS.Timeout | null = null
  private callback: PerformanceCallback | null = null
  private state: PerformanceState = {
    isFullscreenAppActive: false,
    isOnBattery: false,
    isScreenLocked: false,
    shouldPause: false,
    shouldReduceQuality: false
  }

  private pauseOnFullscreen: boolean = true
  private pauseOnBattery: boolean = true

  constructor() {
    this.setupPowerMonitor()
  }

  private setupPowerMonitor(): void {
    powerMonitor.on('lock-screen', () => {
      this.state.isScreenLocked = true
      this.state.shouldPause = true
      this.notify()
    })

    powerMonitor.on('unlock-screen', () => {
      this.state.isScreenLocked = false
      this.updateShouldPause()
      this.notify()
    })

    powerMonitor.on('suspend', () => {
      this.state.shouldPause = true
      this.notify()
    })

    powerMonitor.on('resume', () => {
      this.updateShouldPause()
      this.notify()
    })

    powerMonitor.on('on-ac', () => {
      this.state.isOnBattery = false
      this.state.shouldReduceQuality = false
      this.updateShouldPause()
      this.notify()
    })

    powerMonitor.on('on-battery', () => {
      this.state.isOnBattery = true
      if (this.pauseOnBattery) {
        this.state.shouldReduceQuality = true
      }
      this.updateShouldPause()
      this.notify()
    })
  }

  /**
   * Start monitoring system state at regular intervals
   */
  start(callback: PerformanceCallback, intervalMs: number = 3000): void {
    this.callback = callback

    this.checkInterval = setInterval(() => {
      this.checkState()
    }, intervalMs)

    // Initial check
    this.checkState()
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  private checkState(): void {
    const wasFullscreen = this.state.isFullscreenAppActive

    // Check fullscreen state
    try {
      this.state.isFullscreenAppActive = isFullscreenAppRunning()
    } catch {
      this.state.isFullscreenAppActive = false
    }

    // Check battery state
    try {
      this.state.isOnBattery = isOnBattery()
      this.state.shouldReduceQuality = this.pauseOnBattery && this.state.isOnBattery
    } catch {
      // Ignore
    }

    this.updateShouldPause()

    // Only notify if state changed
    if (wasFullscreen !== this.state.isFullscreenAppActive) {
      this.notify()
    }
  }

  private updateShouldPause(): void {
    this.state.shouldPause =
      this.state.isScreenLocked ||
      (this.pauseOnFullscreen && this.state.isFullscreenAppActive)
  }

  private notify(): void {
    if (this.callback) {
      this.callback({ ...this.state })
    }
  }

  setConfig(pauseOnFullscreen: boolean, pauseOnBattery: boolean): void {
    this.pauseOnFullscreen = pauseOnFullscreen
    this.pauseOnBattery = pauseOnBattery
    this.updateShouldPause()
  }

  getState(): PerformanceState {
    return { ...this.state }
  }

  destroy(): void {
    this.stop()
    this.callback = null
  }
}
