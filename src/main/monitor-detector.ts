import { screen } from 'electron'

export interface MonitorInfo {
  id: number
  label: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  workArea: {
    x: number
    y: number
    width: number
    height: number
  }
  size: {
    width: number
    height: number
  }
  scaleFactor: number
  rotation: number
  isPrimary: boolean
  resolution: string // e.g. "4K", "2K", "FHD"
  refreshRate: number
}

export class MonitorDetector {
  getAllMonitors(): MonitorInfo[] {
    const displays = screen.getAllDisplays()
    const primaryDisplay = screen.getPrimaryDisplay()

    return displays.map((display, index) => {
      const isPrimary = display.id === primaryDisplay.id
      const resolution = this.getResolutionLabel(display.size.width, display.size.height)

      return {
        id: display.id,
        label: `Monitor ${index + 1}${isPrimary ? ' (Primary)' : ''}`,
        bounds: display.bounds,
        workArea: display.workArea,
        size: display.size,
        scaleFactor: display.scaleFactor,
        rotation: display.rotation,
        isPrimary,
        resolution,
        refreshRate: (display as any).displayFrequency || 60
      }
    })
  }

  getPrimaryMonitor(): MonitorInfo | null {
    const monitors = this.getAllMonitors()
    return monitors.find(m => m.isPrimary) || monitors[0] || null
  }

  getResolutionLabel(width: number, height: number): string {
    const pixels = Math.max(width, height)
    if (pixels >= 3840) return '4K'
    if (pixels >= 2560) return '2K'
    if (pixels >= 1920) return 'FHD'
    if (pixels >= 1280) return 'HD'
    return 'SD'
  }

  getRecommendedQuality(monitor: MonitorInfo): {
    width: number
    height: number
    bitrate: string
    fps: number
  } {
    const { width, height } = monitor.size
    const pixels = Math.max(width, height)

    if (pixels >= 3840) {
      return { width: 3840, height: 2160, bitrate: '20M', fps: 30 }
    } else if (pixels >= 2560) {
      return { width: 2560, height: 1440, bitrate: '12M', fps: 30 }
    } else if (pixels >= 1920) {
      return { width: 1920, height: 1080, bitrate: '8M', fps: 30 }
    } else {
      return { width: 1280, height: 720, bitrate: '5M', fps: 30 }
    }
  }
}
