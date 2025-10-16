import { desktopCapturer } from 'electron'
import { trySetPlayerAlwaysOnTop } from '../utils/player-display'
import { alwaysOnTopState } from '../windows'

export async function getZoomScreen() {
  const sources = await desktopCapturer.getSources({ types: ['window'] })

  const zoomWindows = sources.filter(wnd => {
    return wnd.name.toLowerCase().startsWith('zoom')
  })
  const zoomWindow = zoomWindows.toSorted((a, b) => {
    return a.id.localeCompare(b.id)
  }).findLast((wnd) => wnd.name === 'Zoom Workplace')

  const shareZoomWindow = {
    getWindowId: () => zoomWindow?.id,
    isVisible: () => !!zoomWindow && zoomWindows.some(wnd => wnd.name === 'Zoom Meeting'),
  }

  if (!shareZoomWindow?.isVisible())
    throw new Error('Could not find Zoom window')

  const windowId = shareZoomWindow.getWindowId()

  alwaysOnTopState.player = true
  try {
    trySetPlayerAlwaysOnTop()
  } finally {
    return { windowId }
  }
}
