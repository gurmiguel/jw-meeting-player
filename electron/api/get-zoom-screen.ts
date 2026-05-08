import { desktopCapturer } from 'electron'

export async function getZoomScreen() {
  const sources = await desktopCapturer.getSources({ types: ['window'] })

  const zoomWindows = sources.filter(wnd => {
    return wnd.name.toLowerCase().startsWith('zoom')
  })

  return zoomWindows.map(wnd => {
    return {
      id: wnd.id,
      name: wnd.name,
      thumbnail: wnd.thumbnail.toPNG(),
    }
  })
}
