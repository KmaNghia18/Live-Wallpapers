import { useState, useEffect, useCallback } from 'react'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import Gallery from './components/Gallery'
import SettingsPanel from './components/SettingsPanel'
import MonitorInfo from './components/MonitorInfo'
import PlaylistEditor from './components/PlaylistEditor'
import AudioVisualizerSettings from './components/AudioVisualizerSettings'
import SystemWidgets from './components/SystemWidgets'
import NowPlayingBar from './components/NowPlayingBar'

declare global {
  interface Window {
    api: {
      minimizeWindow: () => void
      maximizeWindow: () => void
      closeWindow: () => void
      getMonitors: () => Promise<any[]>
      getSettings: () => Promise<Record<string, unknown>>
      setSetting: (key: string, value: unknown) => Promise<boolean>
      setWallpaper: (path: string, monitorId?: number) => Promise<{ success: boolean; error?: string }>
      pauseWallpaper: () => Promise<boolean>
      playWallpaper: () => Promise<boolean>
      getWallpaperStatus: () => Promise<{ isPlaying: boolean; currentWallpaper: string | null }>
      openFileDialog: () => Promise<string[]>
      getWallpaperLibrary: () => Promise<any[]>
      addToLibrary: (wallpaper: object) => Promise<any[]>
      removeFromLibrary: (path: string) => Promise<any[]>
      updateTray: () => void
      onNextWallpaper: (callback: () => void) => void
      onOpenSettings: (callback: () => void) => void
    }
  }
}

export interface WallpaperItem {
  id: string
  name: string
  path: string
  thumbnail: string
  type: 'video' | 'gif' | 'image' | 'web' | 'shader'
  resolution: string
  size: number
  category: string
  favorite: boolean
  dateAdded: string
}

type PageView = 'gallery' | 'favorites' | 'settings' | 'monitors' | 'playlists' | 'visualizer' | 'system'

function App(): JSX.Element {
  const [currentView, setCurrentView] = useState<PageView>('gallery')
  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentWallpaper, setCurrentWallpaper] = useState<string | null>(null)
  const [settings, setSettings] = useState<Record<string, unknown>>({})

  useEffect(() => {
    loadData()
    window.api.onOpenSettings(() => setCurrentView('settings'))
    window.api.onNextWallpaper(() => handleNextWallpaper())
  }, [])

  const loadData = async (): Promise<void> => {
    try {
      const [library, wallpaperSettings, status] = await Promise.all([
        window.api.getWallpaperLibrary(),
        window.api.getSettings(),
        window.api.getWallpaperStatus()
      ])
      setWallpapers(library || [])
      setSettings(wallpaperSettings || {})
      setIsPlaying(status.isPlaying)
      setCurrentWallpaper(status.currentWallpaper)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const handleSetWallpaper = useCallback(async (wallpaper: WallpaperItem): Promise<void> => {
    const result = await window.api.setWallpaper(wallpaper.path)
    if (result.success) {
      setCurrentWallpaper(wallpaper.path)
      setIsPlaying(true)
      window.api.updateTray()
    }
  }, [])

  const handleAddWallpapers = useCallback(async (): Promise<void> => {
    const filePaths = await window.api.openFileDialog()
    if (filePaths.length === 0) return

    for (const filePath of filePaths) {
      const fileName = filePath.split(/[\\/]/).pop() || 'Unknown'
      const ext = fileName.split('.').pop()?.toLowerCase() || ''
      let type: WallpaperItem['type'] = 'video'
      if (['gif'].includes(ext)) type = 'gif'
      if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) type = 'image'

      const newWallpaper: WallpaperItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: fileName.replace(/\.[^/.]+$/, ''),
        path: filePath,
        thumbnail: filePath,
        type,
        resolution: 'Auto',
        size: 0,
        category: 'Imported',
        favorite: false,
        dateAdded: new Date().toISOString()
      }

      const updated = await window.api.addToLibrary(newWallpaper)
      setWallpapers(updated)
    }
  }, [])

  const handleToggleFavorite = useCallback(async (id: string): Promise<void> => {
    setWallpapers(prev =>
      prev.map(w => (w.id === id ? { ...w, favorite: !w.favorite } : w))
    )
  }, [])

  const handleRemoveWallpaper = useCallback(async (path: string): Promise<void> => {
    const updated = await window.api.removeFromLibrary(path)
    setWallpapers(updated)
  }, [])

  const handleNextWallpaper = useCallback((): void => {
    if (wallpapers.length === 0) return
    const currentIndex = wallpapers.findIndex(w => w.path === currentWallpaper)
    const nextIndex = (currentIndex + 1) % wallpapers.length
    handleSetWallpaper(wallpapers[nextIndex])
  }, [wallpapers, currentWallpaper, handleSetWallpaper])

  const handlePreviousWallpaper = useCallback((): void => {
    if (wallpapers.length === 0) return
    const currentIndex = wallpapers.findIndex(w => w.path === currentWallpaper)
    const prevIndex = (currentIndex - 1 + wallpapers.length) % wallpapers.length
    handleSetWallpaper(wallpapers[prevIndex])
  }, [wallpapers, currentWallpaper, handleSetWallpaper])

  const handleTogglePlay = useCallback(async (): Promise<void> => {
    if (isPlaying) {
      await window.api.pauseWallpaper()
    } else {
      await window.api.playWallpaper()
    }
    setIsPlaying(!isPlaying)
    window.api.updateTray()
  }, [isPlaying])

  const handleSettingChange = useCallback(async (key: string, value: unknown): Promise<void> => {
    await window.api.setSetting(key, value)
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  // Find current wallpaper item for NowPlayingBar
  const currentWallpaperItem = wallpapers.find(w => w.path === currentWallpaper) || null

  const renderContent = (): JSX.Element => {
    switch (currentView) {
      case 'gallery':
        return (
          <Gallery
            wallpapers={wallpapers}
            currentWallpaper={currentWallpaper}
            onSetWallpaper={handleSetWallpaper}
            onAddWallpapers={handleAddWallpapers}
            onToggleFavorite={handleToggleFavorite}
            onRemoveWallpaper={handleRemoveWallpaper}
          />
        )
      case 'favorites':
        return (
          <Gallery
            wallpapers={wallpapers.filter(w => w.favorite)}
            currentWallpaper={currentWallpaper}
            onSetWallpaper={handleSetWallpaper}
            onAddWallpapers={handleAddWallpapers}
            onToggleFavorite={handleToggleFavorite}
            onRemoveWallpaper={handleRemoveWallpaper}
            title="Favorites"
            subtitle="Your favorite wallpapers"
          />
        )
      case 'settings':
        return (
          <SettingsPanel
            settings={settings}
            onSettingChange={handleSettingChange}
          />
        )
      case 'monitors':
        return <MonitorInfo />
      case 'playlists':
        return (
          <PlaylistEditor
            wallpapers={wallpapers}
            currentWallpaper={currentWallpaper}
            onSetWallpaper={handleSetWallpaper}
          />
        )
      case 'visualizer':
        return <AudioVisualizerSettings />
      case 'system':
        return <SystemWidgets />
      default:
        return (
          <Gallery
            wallpapers={wallpapers}
            currentWallpaper={currentWallpaper}
            onSetWallpaper={handleSetWallpaper}
            onAddWallpapers={handleAddWallpapers}
            onToggleFavorite={handleToggleFavorite}
            onRemoveWallpaper={handleRemoveWallpaper}
          />
        )
    }
  }

  return (
    <>
      <TitleBar />
      <div className="app-layout">
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          wallpaperCount={wallpapers.length}
        />
        <main className="main-content">
          {renderContent()}
        </main>
      </div>
      <NowPlayingBar
        currentWallpaper={currentWallpaperItem}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onNext={handleNextWallpaper}
        onPrevious={handlePreviousWallpaper}
      />
    </>
  )
}

export default App
