import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Window controls
  minimizeWindow: (): void => ipcRenderer.send('window-minimize'),
  maximizeWindow: (): void => ipcRenderer.send('window-maximize'),
  closeWindow: (): void => ipcRenderer.send('window-close'),

  // Monitors
  getMonitors: (): Promise<any[]> => ipcRenderer.invoke('get-monitors'),

  // Settings
  getSettings: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('get-settings'),
  setSetting: (key: string, value: unknown): Promise<boolean> =>
    ipcRenderer.invoke('set-setting', key, value),

  // Wallpaper
  setWallpaper: (path: string, monitorId?: number): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('set-wallpaper', path, monitorId),
  pauseWallpaper: (): Promise<boolean> => ipcRenderer.invoke('pause-wallpaper'),
  playWallpaper: (): Promise<boolean> => ipcRenderer.invoke('play-wallpaper'),
  getWallpaperStatus: (): Promise<{ isPlaying: boolean; currentWallpaper: string | null }> =>
    ipcRenderer.invoke('get-wallpaper-status'),

  // Library
  openFileDialog: (): Promise<string[]> => ipcRenderer.invoke('open-file-dialog'),
  getWallpaperLibrary: (): Promise<any[]> => ipcRenderer.invoke('get-wallpaper-library'),
  addToLibrary: (wallpaper: object): Promise<any[]> =>
    ipcRenderer.invoke('add-to-library', wallpaper),
  removeFromLibrary: (path: string): Promise<any[]> =>
    ipcRenderer.invoke('remove-from-library', path),

  // Tray
  updateTray: (): void => ipcRenderer.send('update-tray'),

  // Events from main
  onNextWallpaper: (callback: () => void): void => {
    ipcRenderer.on('next-wallpaper', callback)
  },
  onOpenSettings: (callback: () => void): void => {
    ipcRenderer.on('open-settings', callback)
  },

  // Wallpaper window specific
  onLoadWallpaper: (callback: (_event: any, data: any) => void): void => {
    ipcRenderer.on('load-wallpaper', callback)
  },
  onWallpaperControl: (callback: (_event: any, action: string) => void): void => {
    ipcRenderer.on('wallpaper-control', callback)
  },

  // Dock
  dockToggle: (): Promise<boolean> => ipcRenderer.invoke('dock-toggle'),
  dockShow: (): Promise<boolean> => ipcRenderer.invoke('dock-show'),
  dockHide: (): Promise<boolean> => ipcRenderer.invoke('dock-hide'),
  dockStatus: (): Promise<{ isVisible: boolean }> => ipcRenderer.invoke('dock-status'),
  launchApp: (appId: string): Promise<boolean> => ipcRenderer.invoke('launch-app', appId),
  getSystemStats: (): Promise<any> => ipcRenderer.invoke('get-system-stats')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
