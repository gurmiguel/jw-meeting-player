import { app, BrowserWindow, globalShortcut, Menu, nativeImage, nativeTheme, screen } from 'electron'
import log from 'electron-log/main'
import { autoUpdater } from 'electron-updater'
import path from 'node:path'
import { titleBar } from '../shared/constants'
import { delay } from '../shared/utils'
import { attachEvents } from './events'
import { windows } from './windows'

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist')
process.env.PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')
process.env.FILES_PATH = path.join(app.getPath('userData'), 'files')

const autoUpdaterLogger = log.create({ logId: 'auto-updater' })
autoUpdaterLogger.transports.file!.level = 'debug'
autoUpdater.logger = autoUpdaterLogger
autoUpdater.autoInstallOnAppQuit = true
autoUpdater.autoDownload = true
autoUpdater.autoRunAppAfterInstall = true
autoUpdater.checkForUpdatesAndNotify({
  title: 'Uma nova atualização para este programa está disponível',
  body: 'Feche o programa para atualizar',
})

log.initialize({ preload: true })

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

const isDebugMode = !!VITE_DEV_SERVER_URL || ['1','true'].includes(process.env.DEBUG ?? '')

Menu.setApplicationMenu(null)

if (process.platform === 'win32')
  app.setAppUserModelId(app.getName())

async function createWindows() {
  const displays = screen.getAllDisplays()
  const mainDisplay = !isDebugMode
    ? screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    : displays.find(display => display.id !== screen.getPrimaryDisplay().id) ?? screen.getPrimaryDisplay()
  
  windows.main = new BrowserWindow({
    icon: path.join(process.env.PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      nodeIntegrationInWorker: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    minWidth: 800,
    minHeight: 600,
    x: mainDisplay?.bounds.x,
    y: mainDisplay?.bounds.y,
    titleBarStyle: 'hidden',
    titleBarOverlay: titleBar,
  })

  nativeTheme.themeSource = 'dark'

  windows.main.setSize(1200, 900, false)

  const playerDisplay = displays.find(display => display.id !== mainDisplay.id)
  
  windows.player = new BrowserWindow({
    frame: false,
    fullscreen: true,
    alwaysOnTop: !isDebugMode,
    kiosk: true,
    movable: false,
    webPreferences: {
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    x: playerDisplay?.bounds.x,
    y: playerDisplay?.bounds.y,
  })

  await delay()

  if (isDebugMode) {
    windows.player?.minimize()
    windows.player.once('ready-to-show', () => windows.player?.minimize())
  } else {
    windows.player.maximize()
    windows.main.maximize()
  }

  // Test active push message to Renderer-process.
  windows.main.webContents.on('did-finish-load', () => {
    windows.main?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  windows.main.on('closed', () => {
    windows.player?.close()
  })

  windows.player.on('close', e => {
    if (!windows.main?.isDestroyed()) e.preventDefault()
  })

  attachEvents(windows.main, windows.player)

  if (VITE_DEV_SERVER_URL) {
    await windows.main.loadURL(VITE_DEV_SERVER_URL)
    await windows.player.loadURL(VITE_DEV_SERVER_URL + 'player.html')
  } else {
    // win.loadFile('dist/index.html')
    await windows.main.loadFile(path.join(process.env.DIST, 'index.html'))
    await windows.player.loadFile(path.join(process.env.DIST, 'player.html'))
  }

  if (isDebugMode) {
    [windows.main, windows.player].forEach(win => {
      win.setThumbarButtons([
        {
          tooltip: 'Open Dev Tools',
          icon: nativeImage.createFromPath(path.join(process.env.PUBLIC, 'react-icon.png')),
          click: () => win!.webContents.openDevTools(),
        },
      ])
    })

    globalShortcut.register('CmdOrCtrl+Shift+I', () => {
      BrowserWindow.getFocusedWindow()?.webContents.openDevTools()
      BrowserWindow.getFocusedWindow()?.webContents.devToolsWebContents?.focus()
    })
  
    globalShortcut.register('CmdOrCtrl+Shift+C', () => {
      const window = BrowserWindow.getFocusedWindow()
      window?.webContents.openDevTools()
      window?.webContents.devToolsWebContents?.focus()
    })
  }

  windows.main.webContents.send('set-feedback-source', { sourceId: windows.player.getMediaSourceId() })
}

app.on('window-all-closed', () => {
  // @ts-expect-error "Just removing window references for cleanup"
  windows.main = null
  // @ts-expect-error "Just removing window references for cleanup"
  windows.player = null

  if (process.platform !== 'darwin')
    app.quit()
})

app.whenReady()
  .then(createWindows)
