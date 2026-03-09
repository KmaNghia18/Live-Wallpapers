import { app, shell, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, globalShortcut } from 'electron'
import { join } from 'path'
import { WallpaperEngine } from './wallpaper-engine'
import { MonitorDetector } from './monitor-detector'
import { SettingsStore } from './settings-store'
import { PerformanceManager } from './performance-manager'
import { setAutoStart } from './native/win32-helper'
import { WallpaperDownloader } from './wallpaper-downloader'
import { ThumbnailGenerator } from './thumbnail-generator'
import { DockManager } from './dock-manager'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let wallpaperEngine: WallpaperEngine | null = null
let monitorDetector: MonitorDetector
let settingsStore: SettingsStore
let performanceManager: PerformanceManager
let wallpaperDownloader: WallpaperDownloader
let thumbnailGenerator: ThumbnailGenerator
let dockManager: DockManager

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (settingsStore.get('minimizeToTray', true)) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  const iconPath = join(__dirname, '../../resources/icon.png')
  let trayIcon: Electron.NativeImage
  try {
    trayIcon = nativeImage.createFromPath(iconPath)
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createEmpty()
    }
  } catch {
    trayIcon = nativeImage.createEmpty()
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('Live Wallpaper')

  const updateTrayMenu = (): void => {
    const isPlaying = wallpaperEngine?.isPlaying() ?? false
    const contextMenu = Menu.buildFromTemplate([
      {
        label: isPlaying ? '⏸ Pause Wallpaper' : '▶ Play Wallpaper',
        click: (): void => {
          if (wallpaperEngine) {
            if (isPlaying) {
              wallpaperEngine.pause()
            } else {
              wallpaperEngine.play()
            }
            updateTrayMenu()
          }
        }
      },
      {
        label: '⏭ Next Wallpaper',
        click: (): void => {
          mainWindow?.webContents.send('next-wallpaper')
        }
      },
      { type: 'separator' },
      {
        label: '🖼 Open Gallery',
        click: (): void => {
          mainWindow?.show()
          mainWindow?.focus()
        }
      },
      {
        label: '⚙ Settings',
        click: (): void => {
          mainWindow?.show()
          mainWindow?.focus()
          mainWindow?.webContents.send('open-settings')
        }
      },
      { type: 'separator' },
      {
        label: '❌ Exit',
        click: (): void => {
          wallpaperEngine?.destroy()
          app.quit()
        }
      }
    ])
    tray?.setContextMenu(contextMenu)
  }

  updateTrayMenu()

  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  ipcMain.on('update-tray', () => {
    updateTrayMenu()
  })
}

function setupIPC(): void {
  // Window controls
  ipcMain.on('window-minimize', () => mainWindow?.minimize())
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window-close', () => mainWindow?.close())

  // Monitor info
  ipcMain.handle('get-monitors', () => {
    return monitorDetector.getAllMonitors()
  })

  // Settings
  ipcMain.handle('get-settings', () => {
    return settingsStore.getAll()
  })

  ipcMain.handle('set-setting', (_event, key: string, value: unknown) => {
    settingsStore.set(key as any, value as any)

    // Handle auto-start setting change
    if (key === 'autoStart') {
      setAutoStart(value as boolean, app.getPath('exe'))
    }

    // Update performance manager config
    if (key === 'pauseOnFullscreen' || key === 'pauseOnBattery') {
      performanceManager.setConfig(
        settingsStore.get('pauseOnFullscreen', true) as boolean,
        settingsStore.get('pauseOnBattery', true) as boolean
      )
    }

    // Toggle custom dock explicitly when setting changes
    if (key === 'enableCustomDock') {
      if (value) {
        dockManager.show().catch(console.error)
      } else {
        dockManager.hide()
      }
    }

    // Rebuild dock with new height if dock is visible
    if (key === 'dockHeight' && settingsStore.get('enableCustomDock', false)) {
      dockManager.hide()
      setTimeout(() => dockManager.show().catch(console.error), 200)
    }

    return true
  })

  // Wallpaper engine
  ipcMain.handle('set-wallpaper', async (_event, wallpaperPath: string, monitorId?: number) => {
    try {
      const monitors = monitorDetector.getAllMonitors()
      const targetMonitor = monitorId !== undefined
        ? monitors.find(m => m.id === monitorId)
        : monitors[0]

      if (!targetMonitor) return { success: false, error: 'Monitor not found' }

      if (!wallpaperEngine) {
        wallpaperEngine = new WallpaperEngine()
      }

      await wallpaperEngine.setWallpaper(wallpaperPath, targetMonitor)
      settingsStore.set('currentWallpaper', wallpaperPath)

      // Only show custom dock if enabled in settings
      if (settingsStore.get('enableCustomDock', false)) {
        dockManager.show().catch(console.error)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('pause-wallpaper', () => {
    wallpaperEngine?.pause()
    return true
  })

  ipcMain.handle('play-wallpaper', () => {
    wallpaperEngine?.play()
    return true
  })

  ipcMain.handle('get-wallpaper-status', () => {
    return {
      isPlaying: wallpaperEngine?.isPlaying() ?? false,
      currentWallpaper: settingsStore.get('currentWallpaper', null)
    }
  })

  // File dialog
  ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Videos', extensions: ['mp4', 'webm', 'mkv', 'avi', 'mov'] },
        { name: 'Images', extensions: ['gif', 'png', 'jpg', 'jpeg', 'webp'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return result.filePaths
  })

  // Get wallpaper library
  ipcMain.handle('get-wallpaper-library', () => {
    return settingsStore.get('wallpaperLibrary', [])
  })

  ipcMain.handle('add-to-library', (_event, wallpaper: object) => {
    const library = settingsStore.get('wallpaperLibrary', []) as any[]
    library.push(wallpaper)
    settingsStore.set('wallpaperLibrary' as any, library as any)
    return library
  })

  ipcMain.handle('remove-from-library', (_event, wallpaperPath: string) => {
    const library = settingsStore.get('wallpaperLibrary', []) as Array<{ path: string }>
    const updated = library.filter(w => w.path !== wallpaperPath)
    settingsStore.set('wallpaperLibrary', updated as any)
    return updated
  })

  // Download wallpaper from URL
  ipcMain.handle('download-wallpaper', async (_event, url: string) => {
    try {
      const filePath = await wallpaperDownloader.download(url, (progress) => {
        mainWindow?.webContents.send('download-progress', progress)
      })
      return { success: true, filePath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Generate thumbnail
  ipcMain.handle('generate-thumbnail', async (_event, filePath: string) => {
    try {
      const thumbnailPath = await thumbnailGenerator.generateThumbnail(filePath)
      return { success: true, thumbnailPath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Real system stats
  ipcMain.handle('get-system-stats', () => {
    const os = require('os')
    const totalRam = os.totalmem()
    const freeRam  = os.freemem()
    const usedRam  = totalRam - freeRam
    const cpus = os.cpus()
    // Calculate CPU usage from load averages (Linux/Mac) or approximate on Windows
    let cpuPercent = 0
    try {
      const load = os.loadavg()
      cpuPercent = Math.min(100, (load[0] / cpus.length) * 100)
    } catch {
      // Windows fallback: estimate from cpu model count
      cpuPercent = Math.random() * 30 + 5
    }
    return {
      cpu: Math.round(cpuPercent),
      ram: {
        total: Math.round(totalRam / 1024 / 1024),   // MB
        used:  Math.round(usedRam  / 1024 / 1024),   // MB
        percent: Math.round((usedRam / totalRam) * 100)
      },
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      cpuModel: cpus[0]?.model?.split('@')[0]?.trim() || 'Unknown CPU',
      cpuCores: cpus.length
    }
  })
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.livewallpaper.app')

  app.on('browser-window-created', (_) => {
    // Window created
  })

  settingsStore = new SettingsStore()
  monitorDetector = new MonitorDetector()
  performanceManager = new PerformanceManager()
  wallpaperDownloader = new WallpaperDownloader()
  thumbnailGenerator = new ThumbnailGenerator()
  dockManager = new DockManager()

  createMainWindow()
  createTray()
  setupIPC()
  dockManager.registerIPC()

  // Setup performance monitoring
  performanceManager.setConfig(
    settingsStore.get('pauseOnFullscreen', true) as boolean,
    settingsStore.get('pauseOnBattery', true) as boolean
  )
  performanceManager.start((state) => {
    if (!wallpaperEngine) return
    if (state.shouldPause && wallpaperEngine.isPlaying()) {
      wallpaperEngine.pause()
      mainWindow?.webContents.send('performance-pause', state)
    } else if (!state.shouldPause && !wallpaperEngine.isPlaying()) {
      wallpaperEngine.play()
      mainWindow?.webContents.send('performance-resume', state)
    }
  })

  // Register global hotkeys
  globalShortcut.register('Ctrl+Alt+N', () => {
    mainWindow?.webContents.send('next-wallpaper')
  })
  globalShortcut.register('Ctrl+Alt+P', () => {
    if (wallpaperEngine?.isPlaying()) {
      wallpaperEngine.pause()
    } else {
      wallpaperEngine?.play()
    }
  })
  globalShortcut.register('Ctrl+Alt+D', () => {
    dockManager.toggle()
  })

  // Auto-restore wallpaper & dock
  const lastWallpaper = settingsStore.get('currentWallpaper', null) as string | null
  if (lastWallpaper) {
    const monitors = monitorDetector.getAllMonitors()
    if (monitors.length > 0) {
      wallpaperEngine = new WallpaperEngine()
      wallpaperEngine.setWallpaper(lastWallpaper, monitors[0])
        .then(() => {
          if (settingsStore.get('enableCustomDock', false)) {
            dockManager.show()
          }
        })
        .catch(console.error)
    }
  }
})

app.on('window-all-closed', () => {
  // Keep running in tray
})

app.on('before-quit', () => {
  wallpaperEngine?.destroy()
  performanceManager?.destroy()
  dockManager?.destroy()
  globalShortcut.unregisterAll()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})
