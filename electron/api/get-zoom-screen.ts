import { WindowControl } from '../native_modules/win-control'
import { trySetPlayerAlwaysOnTop } from '../utils/player-display'
import { alwaysOnTopState } from '../windows'

export async function getZoomScreen() {
  const zoomMeeting = WindowControl.getByClassName('ConfMultiTabContentWndClass') ?? WindowControl.getByClassName('ZPContentViewWndClass')
  const shareZoomWindow = zoomMeeting?.getChildren().map(hwnd => new WindowControl(hwnd)).find(win => win.getClassName() === 'VideoContainerWndClass')

  if (!shareZoomWindow?.isVisible())
    throw new Error('Could not find Zoom window')

  alwaysOnTopState.player = true
  try {
    trySetPlayerAlwaysOnTop()
  } finally {
    return { windowId: `window:${shareZoomWindow.getHwnd()}:0` }
  }
}
