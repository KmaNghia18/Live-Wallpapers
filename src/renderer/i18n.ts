/**
 * Simple i18n — tiếng Việt / English
 * Usage: t('gallery.title') => 'Thư viện' | 'Gallery'
 */

export type Language = 'vi' | 'en'

const strings = {
  en: {
    // Sidebar
    'nav.gallery':    'Gallery',
    'nav.favorites':  'Favorites',
    'nav.playlists':  'Playlists',
    'nav.visualizer': 'Visualizer',
    'nav.system':     'System',
    'nav.monitors':   'Monitors',
    'nav.settings':   'Settings',
    'nav.pause':      'Pause',
    'nav.play':       'Play',
    'nav.status.active': 'Wallpaper Active',
    'nav.status.paused': 'Paused',

    // Gallery
    'gallery.title':    'Gallery',
    'gallery.subtitle': 'Your wallpaper collection',
    'gallery.search':   'Search wallpapers...',
    'gallery.add':      '+ Add Wallpaper',
    'gallery.empty':    'No wallpapers yet',
    'gallery.empty.sub':'Click "Add Wallpaper" to get started',
    'gallery.filter.all':    'All',
    'gallery.filter.video':  'Video',
    'gallery.filter.gif':    'GIF',
    'gallery.filter.image':  'Image',
    'gallery.filter.shader': 'Shader',

    // Playlists
    'playlists.title':    'Playlists',
    'playlists.subtitle': 'Auto-rotate wallpaper collections',
    'playlists.new':      '+ New Playlist',
    'playlists.empty':    'No playlists yet',
    'playlists.empty.sub':'Click "New Playlist" to create one',

    // Settings
    'settings.title':    'Settings',
    'settings.subtitle': 'Configure your live wallpaper experience',
    'settings.saved':    '✓ Saved',
    'settings.general':  '⚙️ General',
    'settings.autoStart': 'Start with Windows',
    'settings.autoStart.desc': 'Launch automatically when you log in',
    'settings.minimizeToTray': 'Minimize to Tray',
    'settings.minimizeToTray.desc': 'Keep running in background when closed',
    'settings.theme':    'Theme',
    'settings.theme.desc': 'App appearance',
    'settings.theme.dark': '🌙 Dark',
    'settings.theme.light': '☀️ Light',
    'settings.theme.system': '🖥 System',
    'settings.language': 'Language',
    'settings.language.desc': 'Display language',
    'settings.wallpaper': '🖼️ Wallpaper',
    'settings.quality': 'Video Quality',
    'settings.quality.desc': 'Auto-detect or force specific resolution',
    'settings.fps': 'FPS Limit',
    'settings.fps.desc': 'Limit frame rate to save resources',
    'settings.fillMode': 'Fill Mode',
    'settings.fillMode.desc': 'How wallpaper fills the screen',
    'settings.fillMode.cover': 'Cover (fill screen)',
    'settings.fillMode.contain': 'Contain (fit inside)',
    'settings.fillMode.stretch': 'Stretch',
    'settings.audio': '🔊 Audio',
    'settings.mute': 'Mute Wallpaper Audio',
    'settings.mute.desc': 'Mute sound from video wallpapers',
    'settings.volume': 'Volume',
    'settings.volume.desc': 'Wallpaper audio level',
    'settings.performance': '⚡ Performance',
    'settings.pauseFullscreen': 'Pause on Fullscreen App',
    'settings.pauseFullscreen.desc': 'Auto-pause when games or apps go fullscreen',
    'settings.battery': 'Battery Saver',
    'settings.battery.desc': 'Reduce quality and FPS when on battery power',
    'settings.hwAccel': 'Hardware Acceleration',
    'settings.hwAccel.value': 'Always On',
    'settings.dock': '🖥️ Desktop Dock',
    'settings.dock.enable': 'Enable Custom Dock',
    'settings.dock.enable.desc': 'Replace Windows taskbar with a premium galaxy-style dock',
    'settings.dock.height': 'Dock Height',
    'settings.dock.height.desc': 'Size of the dock bar',
    'settings.dock.hotkey': 'Dock Hotkey',
    'settings.dock.hotkey.desc': 'Toggle dock visibility',
    'settings.dock.search': 'Search Launcher',
    'settings.dock.search.desc': 'Open app search from dock',
    'settings.hotkeys': '⌨️ Hotkeys',
    'settings.hotkey.next': 'Next Wallpaper',
    'settings.hotkey.play': 'Play / Pause',
    'settings.hotkey.dock': 'Toggle Dock',
    'settings.hotkey.search': 'Dock Search',
    'settings.about': 'ℹ️ About',
    'settings.version': 'Version',
    'settings.author': 'Author',
    'settings.screensaver': '🌀 Screensaver',
    'settings.screensaver.enable': 'Enable Screensaver',
    'settings.screensaver.enable.desc': 'Show animated screensaver when idle',
    'settings.screensaver.idle': 'Idle Timeout',
    'settings.screensaver.idle.desc': 'Start screensaver after inactivity',
    'settings.screensaver.current': 'Use Current Wallpaper',
    'settings.screensaver.current.desc': 'Use active wallpaper as screensaver',

    // NowPlaying
    'nowplaying.auto': 'Auto',
  },
  vi: {
    // Sidebar
    'nav.gallery':    'Thư viện',
    'nav.favorites':  'Yêu thích',
    'nav.playlists':  'Danh sách phát',
    'nav.visualizer': 'Hiển thị âm thanh',
    'nav.system':     'Hệ thống',
    'nav.monitors':   'Màn hình',
    'nav.settings':   'Cài đặt',
    'nav.pause':      'Tạm dừng',
    'nav.play':       'Phát',
    'nav.status.active': 'Hình nền đang chạy',
    'nav.status.paused': 'Đã tạm dừng',

    // Gallery
    'gallery.title':    'Thư viện',
    'gallery.subtitle': 'Bộ sưu tập hình nền của bạn',
    'gallery.search':   'Tìm hình nền...',
    'gallery.add':      '+ Thêm hình nền',
    'gallery.empty':    'Chưa có hình nền',
    'gallery.empty.sub':'Nhấn "Thêm hình nền" để bắt đầu',
    'gallery.filter.all':    'Tất cả',
    'gallery.filter.video':  'Video',
    'gallery.filter.gif':    'GIF',
    'gallery.filter.image':  'Ảnh',
    'gallery.filter.shader': 'Shader',

    // Playlists
    'playlists.title':    'Danh sách phát',
    'playlists.subtitle': 'Tự động xoay vòng hình nền',
    'playlists.new':      '+ Tạo mới',
    'playlists.empty':    'Chưa có danh sách nào',
    'playlists.empty.sub':'Nhấn "Tạo mới" để bắt đầu',

    // Settings
    'settings.title':    'Cài đặt',
    'settings.subtitle': 'Tùy chỉnh trải nghiệm hình nền động',
    'settings.saved':    '✓ Đã lưu',
    'settings.general':  '⚙️ Chung',
    'settings.autoStart': 'Khởi động cùng Windows',
    'settings.autoStart.desc': 'Tự động mở khi đăng nhập',
    'settings.minimizeToTray': 'Thu nhỏ vào khay hệ thống',
    'settings.minimizeToTray.desc': 'Tiếp tục chạy nền khi đóng cửa sổ',
    'settings.theme':    'Giao diện',
    'settings.theme.desc': 'Màu sắc của ứng dụng',
    'settings.theme.dark': '🌙 Tối',
    'settings.theme.light': '☀️ Sáng',
    'settings.theme.system': '🖥 Theo hệ thống',
    'settings.language': 'Ngôn ngữ',
    'settings.language.desc': 'Ngôn ngữ hiển thị',
    'settings.wallpaper': '🖼️ Hình nền',
    'settings.quality': 'Chất lượng video',
    'settings.quality.desc': 'Tự phát hiện hoặc chọn độ phân giải',
    'settings.fps': 'Giới hạn FPS',
    'settings.fps.desc': 'Giới hạn tốc độ khung hình để tiết kiệm tài nguyên',
    'settings.fillMode': 'Chế độ lấp đầy',
    'settings.fillMode.desc': 'Cách hình nền lấp đầy màn hình',
    'settings.fillMode.cover': 'Lấp đầy (Cover)',
    'settings.fillMode.contain': 'Vừa khung (Contain)',
    'settings.fillMode.stretch': 'Kéo giãn (Stretch)',
    'settings.audio': '🔊 Âm thanh',
    'settings.mute': 'Tắt tiếng hình nền',
    'settings.mute.desc': 'Tắt âm thanh từ hình nền video',
    'settings.volume': 'Âm lượng',
    'settings.volume.desc': 'Mức âm lượng hình nền',
    'settings.performance': '⚡ Hiệu suất',
    'settings.pauseFullscreen': 'Tạm dừng khi toàn màn hình',
    'settings.pauseFullscreen.desc': 'Tự tạm dừng khi game/ứng dụng toàn màn hình',
    'settings.battery': 'Tiết kiệm pin',
    'settings.battery.desc': 'Giảm chất lượng và FPS khi dùng pin',
    'settings.hwAccel': 'Tăng tốc phần cứng',
    'settings.hwAccel.value': 'Luôn bật',
    'settings.dock': '🖥️ Thanh Dock',
    'settings.dock.enable': 'Bật thanh Dock tùy chỉnh',
    'settings.dock.enable.desc': 'Thay thế taskbar Windows bằng dock galaxy cao cấp',
    'settings.dock.height': 'Chiều cao Dock',
    'settings.dock.height.desc': 'Kích thước thanh dock',
    'settings.dock.hotkey': 'Phím tắt Dock',
    'settings.dock.hotkey.desc': 'Bật/tắt hiển thị dock',
    'settings.dock.search': 'Tìm kiếm ứng dụng',
    'settings.dock.search.desc': 'Mở tìm kiếm từ dock',
    'settings.hotkeys': '⌨️ Phím tắt',
    'settings.hotkey.next': 'Hình nền tiếp theo',
    'settings.hotkey.play': 'Phát / Tạm dừng',
    'settings.hotkey.dock': 'Bật/tắt Dock',
    'settings.hotkey.search': 'Tìm kiếm Dock',
    'settings.about': 'ℹ️ Về ứng dụng',
    'settings.version': 'Phiên bản',
    'settings.author': 'Tác giả',
    'settings.screensaver': '🌀 Màn hình chờ',
    'settings.screensaver.enable': 'Bật màn hình chờ',
    'settings.screensaver.enable.desc': 'Hiển thị hoạt ảnh khi không dùng máy',
    'settings.screensaver.idle': 'Thời gian chờ',
    'settings.screensaver.idle.desc': 'Bắt đầu màn hình chờ sau thời gian không hoạt động',
    'settings.screensaver.current': 'Dùng hình nền hiện tại',
    'settings.screensaver.current.desc': 'Dùng hình nền đang phát làm màn hình chờ',

    // NowPlaying
    'nowplaying.auto': 'Tự động',
  }
} as const

let _lang: Language = (localStorage.getItem('app_language') as Language) || 'vi'

export function setLanguage(lang: Language): void {
  _lang = lang
  localStorage.setItem('app_language', lang)
}

export function getLanguage(): Language {
  return _lang
}

export function t(key: keyof typeof strings['en']): string {
  return (strings[_lang] as Record<string, string>)[key]
    ?? (strings['en'] as Record<string, string>)[key]
    ?? key
}
