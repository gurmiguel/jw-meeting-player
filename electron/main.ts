import { app, BrowserWindow, globalShortcut, Menu, nativeImage, nativeTheme, screen } from 'electron'
import log from 'electron-log/main'
import { autoUpdater } from 'electron-updater'
import path from 'node:path'
import { titleBar } from '../shared/constants'
import { delay } from '../shared/utils'
import { attachEvents } from './events'

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

let mainWindow: BrowserWindow | null
let playerWindow: BrowserWindow | null
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
  
  mainWindow = new BrowserWindow({
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

  mainWindow.setSize(1200, 900, false)

  const playerDisplay = displays.find(display => display.id !== mainDisplay.id)
  
  playerWindow = new BrowserWindow({
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
    playerWindow?.minimize()
    playerWindow.once('ready-to-show', () => playerWindow?.minimize())
  } else {
    playerWindow.maximize()
    mainWindow.maximize()
  }

  // Test active push message to Renderer-process.
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  mainWindow.on('closed', () => {
    playerWindow?.close()
  })

  playerWindow.on('close', e => {
    if (!mainWindow?.isDestroyed()) e.preventDefault()
  })

  attachEvents(mainWindow, playerWindow)

  if (VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(VITE_DEV_SERVER_URL)
    await playerWindow.loadURL(VITE_DEV_SERVER_URL + 'player.html')
  } else {
    // win.loadFile('dist/index.html')
    await mainWindow.loadFile(path.join(process.env.DIST, 'index.html'))
    await playerWindow.loadFile(path.join(process.env.DIST, 'player.html'))
  }

  if (isDebugMode) {
    [mainWindow, playerWindow].forEach(win => {
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

  mainWindow.webContents.send('set-feedback-source', { sourceId: playerWindow.getMediaSourceId() })
}

app.on('window-all-closed', () => {
  mainWindow = null
  playerWindow = null

  if (process.platform !== 'darwin')
    app.quit()
})

app.whenReady()
  .then(createWindows)
