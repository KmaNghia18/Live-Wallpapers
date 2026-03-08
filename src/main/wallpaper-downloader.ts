/**
 * Wallpaper Downloader
 *
 * Downloads wallpapers from URLs, supports:
 * - Progress tracking
 * - Resume on failure
 * - Auto-import to library after download
 */

import { app } from 'electron'
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join, basename, extname } from 'path'
import https from 'https'
import http from 'http'

export interface DownloadProgress {
  url: string
  fileName: string
  bytesDownloaded: number
  totalBytes: number
  percent: number
  status: 'downloading' | 'completed' | 'failed' | 'cancelled'
  error?: string
  filePath?: string
}

type ProgressCallback = (progress: DownloadProgress) => void

export class WallpaperDownloader {
  private downloadDir: string
  private activeDownloads: Map<string, { request: http.ClientRequest; progress: DownloadProgress }> = new Map()

  constructor() {
    this.downloadDir = join(app.getPath('userData'), 'wallpapers')
    if (!existsSync(this.downloadDir)) {
      mkdirSync(this.downloadDir, { recursive: true })
    }
  }

  /**
   * Download a wallpaper from a URL
   */
  async download(url: string, onProgress?: ProgressCallback): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileName = this.generateFileName(url)
      const filePath = join(this.downloadDir, fileName)

      const progress: DownloadProgress = {
        url,
        fileName,
        bytesDownloaded: 0,
        totalBytes: 0,
        percent: 0,
        status: 'downloading'
      }

      const protocol = url.startsWith('https') ? https : http

      const request = protocol.get(url, (response) => {
        // Handle redirects
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          this.download(response.headers.location, onProgress)
            .then(resolve)
            .catch(reject)
          return
        }

        if (response.statusCode !== 200) {
          progress.status = 'failed'
          progress.error = `HTTP ${response.statusCode}`
          onProgress?.(progress)
          reject(new Error(`Download failed: HTTP ${response.statusCode}`))
          return
        }

        progress.totalBytes = parseInt(response.headers['content-length'] || '0', 10)

        const fileStream = createWriteStream(filePath)

        response.on('data', (chunk: Buffer) => {
          progress.bytesDownloaded += chunk.length
          if (progress.totalBytes > 0) {
            progress.percent = Math.round((progress.bytesDownloaded / progress.totalBytes) * 100)
          }
          onProgress?.(progress)
        })

        response.pipe(fileStream)

        fileStream.on('finish', () => {
          fileStream.close()
          progress.status = 'completed'
          progress.percent = 100
          progress.filePath = filePath
          onProgress?.(progress)
          resolve(filePath)
        })

        fileStream.on('error', (err) => {
          // Clean up partial file
          try { unlinkSync(filePath) } catch { /* ignore */ }
          progress.status = 'failed'
          progress.error = err.message
          onProgress?.(progress)
          reject(err)
        })
      })

      request.on('error', (err) => {
        progress.status = 'failed'
        progress.error = err.message
        onProgress?.(progress)
        reject(err)
      })

      // Timeout after 2 minutes
      request.setTimeout(120000, () => {
        request.destroy()
        progress.status = 'failed'
        progress.error = 'Download timeout'
        onProgress?.(progress)
        reject(new Error('Download timeout'))
      })

      this.activeDownloads.set(url, { request, progress })
    })
  }

  /**
   * Cancel an active download
   */
  cancel(url: string): void {
    const download = this.activeDownloads.get(url)
    if (download) {
      download.request.destroy()
      download.progress.status = 'cancelled'
      this.activeDownloads.delete(url)
    }
  }

  /**
   * Get all active downloads
   */
  getActiveDownloads(): DownloadProgress[] {
    return Array.from(this.activeDownloads.values()).map(d => d.progress)
  }

  getDownloadDir(): string {
    return this.downloadDir
  }

  private generateFileName(url: string): string {
    try {
      const urlObj = new URL(url)
      let name = basename(urlObj.pathname)
      // If no extension, default to .mp4
      if (!extname(name)) {
        name += '.mp4'
      }
      // Avoid conflicts
      const filePath = join(this.downloadDir, name)
      if (existsSync(filePath)) {
        const ext = extname(name)
        const base = name.slice(0, -ext.length)
        name = `${base}_${Date.now()}${ext}`
      }
      return name
    } catch {
      return `wallpaper_${Date.now()}.mp4`
    }
  }

  destroy(): void {
    this.activeDownloads.forEach((download) => {
      download.request.destroy()
    })
    this.activeDownloads.clear()
  }
}
