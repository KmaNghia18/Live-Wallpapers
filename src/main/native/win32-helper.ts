/**
 * Win32 Helper - Native Windows API interactions
 *
 * Provides Win32 API bindings for the WorkerW window technique
 * and other Windows-specific operations like fullscreen detection
 * and auto-start registration.
 *
 * Note: This uses child_process to call PowerShell for Win32 operations
 * instead of ffi-napi to avoid native build complexities.
 */

import { execSync, exec } from 'child_process'
import { app } from 'electron'
import { join } from 'path'

/**
 * Send the special message to Progman to spawn WorkerW.
 * This is the core of the live wallpaper technique on Windows.
 *
 * Uses PowerShell with C# interop to call SendMessageTimeout.
 */
export function spawnWorkerW(): boolean {
  try {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WallpaperHelper {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindowEx(IntPtr parentHandle, IntPtr hWndChildAfter, string className, string windowTitle);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam, uint fuFlags, uint uTimeout, out IntPtr lpdwResult);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

$progman = [WallpaperHelper]::FindWindow("Progman", $null)
$result = [IntPtr]::Zero
[WallpaperHelper]::SendMessageTimeout($progman, 0x052C, [IntPtr]::Zero, [IntPtr]::Zero, 0, 1000, [ref]$result)

# Find the WorkerW behind SHELLDLL_DefView
$workerW = [IntPtr]::Zero
$currentWorkerW = [IntPtr]::Zero
do {
    $currentWorkerW = [WallpaperHelper]::FindWindowEx([IntPtr]::Zero, $currentWorkerW, "WorkerW", $null)
    if ($currentWorkerW -ne [IntPtr]::Zero) {
        $shellView = [WallpaperHelper]::FindWindowEx($currentWorkerW, [IntPtr]::Zero, "SHELLDLL_DefView", $null)
        if ($shellView -ne [IntPtr]::Zero) {
            $workerW = [WallpaperHelper]::FindWindowEx([IntPtr]::Zero, $currentWorkerW, "WorkerW", $null)
        }
    }
} while ($currentWorkerW -ne [IntPtr]::Zero -and $workerW -eq [IntPtr]::Zero)

Write-Output $workerW.ToInt64()
`
    const result = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      timeout: 5000
    }).trim()

    console.log('WorkerW handle:', result)
    return parseInt(result) !== 0
  } catch (error) {
    console.error('Failed to spawn WorkerW:', error)
    return false
  }
}

/**
 * Get the WorkerW window handle that we should parent our wallpaper window to.
 */
export function getWorkerWHandle(): number {
  try {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WHelper {
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string c, string t);
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindowEx(IntPtr p, IntPtr a, string c, string t);
    [DllImport("user32.dll", CharSet=CharSet.Auto)]
    public static extern IntPtr SendMessageTimeout(IntPtr h, uint m, IntPtr w, IntPtr l, uint f, uint t2, out IntPtr r);
}
"@
$p = [WHelper]::FindWindow("Progman", $null)
$r = [IntPtr]::Zero
[WHelper]::SendMessageTimeout($p, 0x052C, [IntPtr]::Zero, [IntPtr]::Zero, 0, 1000, [ref]$r)
$w = [IntPtr]::Zero
$c = [IntPtr]::Zero
do {
    $c = [WHelper]::FindWindowEx([IntPtr]::Zero, $c, "WorkerW", $null)
    if ($c -ne [IntPtr]::Zero) {
        $s = [WHelper]::FindWindowEx($c, [IntPtr]::Zero, "SHELLDLL_DefView", $null)
        if ($s -ne [IntPtr]::Zero) {
            $w = [WHelper]::FindWindowEx([IntPtr]::Zero, $c, "WorkerW", $null)
        }
    }
} while ($c -ne [IntPtr]::Zero -and $w -eq [IntPtr]::Zero)
Write-Output $w.ToInt64()
`
    const result = execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/\r?\n/g, ' ').replace(/"/g, '\\"')}"`,
      { encoding: 'utf8', timeout: 5000 }
    ).trim()

    return parseInt(result) || 0
  } catch {
    return 0
  }
}

/**
 * Set a window as child of WorkerW (embed behind desktop icons)
 */
export function setParentToWorkerW(childHandle: number, workerWHandle: number): boolean {
  try {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WP {
    [DllImport("user32.dll")]
    public static extern IntPtr SetParent(IntPtr c, IntPtr p);
}
"@
[WP]::SetParent([IntPtr]${childHandle}, [IntPtr]${workerWHandle})
Write-Output "OK"
`
    execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/\r?\n/g, ' ').replace(/"/g, '\\"')}"`,
      { encoding: 'utf8', timeout: 5000 }
    )
    return true
  } catch {
    return false
  }
}

/**
 * Check if any fullscreen app is currently running (for auto-pause feature)
 */
export function isFullscreenAppRunning(): boolean {
  try {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class FSCheck {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
$fg = [FSCheck]::GetForegroundWindow()
$rect = New-Object FSCheck+RECT
[FSCheck]::GetWindowRect($fg, [ref]$rect) | Out-Null
$sw = [FSCheck]::GetSystemMetrics(0)
$sh = [FSCheck]::GetSystemMetrics(1)
$isFS = ($rect.Left -le 0 -and $rect.Top -le 0 -and $rect.Right -ge $sw -and $rect.Bottom -ge $sh)
Write-Output $isFS
`
    const result = execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/\r?\n/g, ' ').replace(/"/g, '\\"')}"`,
      { encoding: 'utf8', timeout: 3000 }
    ).trim()

    return result === 'True'
  } catch {
    return false
  }
}

/**
 * Register app to start with Windows via Registry
 */
export function setAutoStart(enable: boolean): boolean {
  try {
    const appPath = app.getPath('exe')
    if (enable) {
      execSync(
        `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "LiveWallpaper" /t REG_SZ /d "${appPath}" /f`,
        { encoding: 'utf8', timeout: 3000 }
      )
    } else {
      execSync(
        `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "LiveWallpaper" /f`,
        { encoding: 'utf8', timeout: 3000 }
      )
    }
    return true
  } catch {
    return false
  }
}

/**
 * Check if running on battery power
 */
export function isOnBattery(): boolean {
  try {
    const result = execSync(
      'powershell -NoProfile -Command "(Get-WmiObject Win32_Battery).BatteryStatus"',
      { encoding: 'utf8', timeout: 3000 }
    ).trim()
    // BatteryStatus: 1 = discharging (on battery), 2 = on AC
    return result === '1'
  } catch {
    return false // Assume desktop (no battery)
  }
}
