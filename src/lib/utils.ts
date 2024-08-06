
export function getFilename(filepath: string) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return filepath.replace(/\\/g, '/').split('/').pop()!
}

export function getContainerBoundaries(container: HTMLElement | Window = window, gutter = 0) {
  if (container instanceof Window)
    return {
      top: gutter,
      left: gutter,
      bottom: window.innerHeight - gutter,
      right: window.innerWidth - gutter - (window.scrollbars.visible ? 20 : 0),
    }
  else
    return {
      top: gutter,
      left: gutter,
      bottom: container.offsetHeight,
      right: container.offsetWidth,
    }
}
