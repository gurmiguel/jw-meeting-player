import { BrowserWindow, Menu, app, globalShortcut, nativeImage, nativeTheme, screen, shell } from 'electron'
import log from 'electron-log/main'
import { autoUpdater } from 'electron-updater'
import os from 'node:os'
import path from 'node:path'
import { titleBar } from '../shared/constants'
import { delay } from '../shared/utils'
import { attachEvents } from './events'
import disablePeek from './native_modules/disable_peek'
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

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

const isDebugMode = !!VITE_DEV_SERVER_URL || ['1','true'].includes(process.env.DEBUG ?? '')

const autoUpdaterLogger = log.create({ logId: 'auto-updater' })
if (isDebugMode) {
  autoUpdater.updateConfigPath = path.join(app.getAppPath(), 'dev-app-update.yml')
  autoUpdater.forceDevUpdateConfig = true
}
autoUpdaterLogger.transports.file!.level = 'debug'
autoUpdater.logger = autoUpdaterLogger
autoUpdater.disableWebInstaller = true
autoUpdater.autoInstallOnAppQuit = true
autoUpdater.autoDownload = true
autoUpdater.autoRunAppAfterInstall = true
autoUpdater.checkForUpdates()
  .then(async (update) => {
    if (!update) return

    const { downloadPromise, updateInfo } = update

    await downloadPromise

    hasUpdateAvailable = true
    
    windows.main.webContents.send('update-available', updateInfo)
  })
let hasUpdateAvailable = false

log.initialize({ preload: true })

Menu.setApplicationMenu(null)

if (process.platform === 'win32')
  app.setAppUserModelId(app.getName())

async function createWindows() {
  const displays = screen.getAllDisplays()
  const mainDisplay = !isDebugMode
    ? screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    : displays.find(display => display.id !== screen.getPrimaryDisplay().id) ?? screen.getPrimaryDisplay()
  
  windows.main = new BrowserWindow({
    backgroundColor: '#18181b',
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
    titleBarStyle: 'default',
    titleBarOverlay: titleBar,
  })

  windows.main.setSize(1200, 900, false)

  const getPlayerDisplay = (mainDisplay: Electron.Display) => displays.find(display => display.id !== mainDisplay.id)

  const playerDisplay = getPlayerDisplay(mainDisplay)

  nativeTheme.themeSource = 'dark'
  
  windows.player = new BrowserWindow({
    frame: false,
    fullscreen: true,
    kiosk: true,
    movable: false,
    alwaysOnTop: displays.length > 1,
    minimizable: false,
    paintWhenInitiallyHidden: true,
    backgroundColor: '#000',
    darkTheme: true,
    backgroundMaterial: 'none',
    webPreferences: {
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    x: playerDisplay?.bounds.x,
    y: playerDisplay?.bounds.y,
  })

  if (os.platform() === 'win32')
    disablePeek(windows.player.getNativeWindowHandle())

  await delay()

  if (displays.length > 1)
    windows.player.maximize()
  if (!isDebugMode)
    windows.main.maximize()

  screen.on('display-removed', () => {
    const displays = screen.getAllDisplays()

    if (displays.length <= 1)
      windows.player.setAlwaysOnTop(false)
  })

  screen.on('display-added', () => {
    const newDisplays = screen.getAllDisplays()

    if (displays.length <= 1 && newDisplays.length > 1) {
      const mainDisplay = screen.getDisplayNearestPoint(windows.main.getNormalBounds())
      const playerDisplay = getPlayerDisplay(mainDisplay)
      const { x, y } = playerDisplay!.bounds

      windows.player.setPosition(x, y, false)
      windows.player.setAlwaysOnTop(true)
    }
  })

  windows.main.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url)
      return { action: 'deny' }
    } else
      return { action: 'allow' }
  })

  // Test active push message to Renderer-process.
  windows.main.webContents.on('did-finish-load', () => {
    windows.main?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  windows.main.webContents.on('crashed', () => {
    windows.main.close()
  })

  windows.main.once('close', () => {
    if (hasUpdateAvailable)
      autoUpdater.quitAndInstall(false, true)
    else
      log.debug('No update available.')
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

async function cleanup() {
  // @ts-expect-error "Just removing window references for cleanup"
  windows.main = null
  // @ts-expect-error "Just removing window references for cleanup"
  windows.player = null

  if (process.platform !== 'darwin')
    app.quit()
}

app.on('window-all-closed', cleanup)

app.whenReady()
  .then(createWindows)
  .catch(cleanup)
