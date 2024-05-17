import { tasklist } from 'tasklist'
import { Window } from '../native_modules/win-control'
import { trySetPlayerAlwaysOnTop } from '../utils/player-display'
import { alwaysOnTopState } from '../windows'

export async function getZoomScreen() {
  const windows = await tasklist({ filter: ['Status eq running', 'Windowtitle eq Zoom'] })

  const shareZoomWindow = windows
    .map(win => Window.getByPid(win.pid))
    .find(win => win.getClassName() === 'ZPContentViewWndClass')

  if (!shareZoomWindow)
    throw new Error('Could not find Zoom window')

  alwaysOnTopState.player = !alwaysOnTopState.player
  trySetPlayerAlwaysOnTop()

  return { windowId: `window:${shareZoomWindow.getHwnd()}:0` }
}
