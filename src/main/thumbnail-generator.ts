/**
 * Thumbnail Generator
 *
 * Generates thumbnail images from video files using HTML5 Canvas.
 * Falls back to file path as thumbnail if generation fails.
 */

import { BrowserWindow } from 'electron'
import { join, extname, basename } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { app } from 'electron'

export class ThumbnailGenerator {
  private thumbnailDir: string

  constructor() {
    this.thumbnailDir = join(app.getPath('userData'), 'thumbnails')
    if (!existsSync(this.thumbnailDir)) {
      mkdirSync(this.thumbnailDir, { recursive: true })
    }
  }

  /**
   * Generate a thumbnail for a video file.
   * Captures a frame at 25% of the video duration.
   */
  async generateVideoThumbnail(videoPath: string): Promise<string> {
    const thumbnailName = `thumb_${basename(videoPath, extname(videoPath))}_${Date.now()}.jpg`
    const thumbnailPath = join(this.thumbnailDir, thumbnailName)

    // Check if thumbnail already exists
    const existingThumb = this.findExistingThumbnail(videoPath)
    if (existingThumb) return existingThumb

    try {
      // Create a hidden window to capture video frame
      const captureWindow = new BrowserWindow({
        width: 320,
        height: 180,
        show: false,
        webPreferences: {
          offscreen: true,
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      // Normalize path for file:// URL
      const normalizedPath = videoPath.replace(/\\/g, '/')
      const fileUrl = normalizedPath.startsWith('/') ? `file://${normalizedPath}` : `file:///${normalizedPath}`

      const html = `
        <!DOCTYPE html>
        <html><body style="margin:0;background:#000">
        <video id="v" src="${fileUrl}" muted preload="auto"
          style="width:320px;height:180px;object-fit:cover"></video>
        <script>
          const v = document.getElementById('v');
          v.addEventListener('loadedmetadata', () => {
            v.currentTime = v.duration * 0.25;
          });
          v.addEventListener('seeked', () => {
            setTimeout(() => {
              document.title = 'READY';
            }, 100);
          });
          v.addEventListener('error', () => {
            document.title = 'ERROR';
          });
        </script>
        </body></html>
      `

      await captureWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

      // Wait for video to seek
      const ready = await new Promise<boolean>((resolve) => {
        let checkCount = 0
        const interval = setInterval(async () => {
          checkCount++
          try {
            const title = captureWindow.getTitle()
            if (title === 'READY') {
              clearInterval(interval)
              resolve(true)
            } else if (title === 'ERROR' || checkCount > 100) {
              clearInterval(interval)
              resolve(false)
            }
          } catch {
            clearInterval(interval)
            resolve(false)
          }
        }, 100)
      })

      if (ready) {
        // Capture the frame
        const image = await captureWindow.webContents.capturePage()
        const jpegBuffer = image.toJPEG(80)
        writeFileSync(thumbnailPath, jpegBuffer)
        captureWindow.close()
        return thumbnailPath
      }

      captureWindow.close()
      return videoPath // Fallback: use video path itself
    } catch (error) {
      console.error('Thumbnail generation failed:', error)
      return videoPath // Fallback
    }
  }

  /**
   * For images, just return the file path (it IS the thumbnail)
   */
  getImageThumbnail(imagePath: string): string {
    return imagePath
  }

  /**
   * Generate thumbnail based on file type
   */
  async generateThumbnail(filePath: string): Promise<string> {
    const ext = extname(filePath).toLowerCase()
    const videoExts = ['.mp4', '.webm', '.mkv', '.avi', '.mov']
    const imageExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']

    if (videoExts.includes(ext)) {
      return this.generateVideoThumbnail(filePath)
    } else if (imageExts.includes(ext)) {
      return this.getImageThumbnail(filePath)
    }

    return filePath // No thumbnail possible
  }

  private findExistingThumbnail(videoPath: string): string | null {
    const baseName = basename(videoPath, extname(videoPath))
    // Simple check — look for any thumb starting with the base name
    try {
      const { readdirSync } = require('fs')
      const files = readdirSync(this.thumbnailDir) as string[]
      const match = files.find((f: string) => f.startsWith(`thumb_${baseName}_`))
      if (match) return join(this.thumbnailDir, match)
    } catch { /* ignore */ }
    return null
  }

  getThumbnailDir(): string {
    return this.thumbnailDir
  }
}
