import { screen } from 'electron'
import { alwaysOnTopState, windows } from '../windows'

export function trySetPlayerAlwaysOnTop() {
  const displays = screen.getAllDisplays()
  
  if (alwaysOnTopState.player) {
    if (displays.length > 1) {
      const mainDisplay = screen.getDisplayNearestPoint(windows.main.getNormalBounds())
      const playerDisplay = displays.find(display => display.id !== mainDisplay.id)
      const { x, y } = playerDisplay!.bounds

      console.log({ x , y })
      windows.player.setPosition(x, y, false)
      windows.player.show()
      windows.player.moveTop()
      windows.player.setAlwaysOnTop(true, 'screen-saver')
      return
    }
  }

  windows.player.setAlwaysOnTop(false)
}
