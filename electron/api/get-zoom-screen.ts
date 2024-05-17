import { listOpenWindows } from '@josephuspaye/list-open-windows'
import { trySetPlayerAlwaysOnTop } from '../utils/player-display'
import { alwaysOnTopState } from '../windows'

export async function getZoomScreen() {
  const windows = listOpenWindows()

  const shareZoomWindow = windows.findLast(window => window.className === 'ZPContentViewWndClass' && window.caption === 'Zoom')

  if (!shareZoomWindow)
    throw new Error('Could not find Zoom window')

  alwaysOnTopState.player = !alwaysOnTopState.player
  trySetPlayerAlwaysOnTop()

  return { windowId: `window:${shareZoomWindow.handle}:0` }
}
