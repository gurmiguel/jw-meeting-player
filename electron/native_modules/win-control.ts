export interface WindowControl {
  setForeground(): boolean
  setPosition(insertAfter: number, X: number, Y: number, cx: number, cy: number, uFlags: number): void
  setShowStatus(newStatus: number): boolean
  moveRelative(dX: number, dY: number, dW: number, dH: number): boolean
  getHwnd(): number
  getDimensions(): Record<'left' | 'top' | 'right' | 'bottom', number>
  isVisible(): boolean
  exists(): boolean
  getTitle(): string
  getClassName(): string
  getPid(): number
  getProcessInfo(): { windowText: string } & Partial<{ pid: number, path: string }>
  getAncestor(hwnd: number): WindowControl | undefined
  getParent(): WindowControl | undefined
  getChildren(): number[]
  close(): boolean
}

export interface WindowStatic {
  new (hwnd: number): WindowControl

  // static methods
  getForeground(): WindowControl | undefined
  getByPid(pid: number): WindowControl | undefined
  getByTitle(title: string): WindowControl | undefined
  getByClassName(className: string): WindowControl | undefined
  getWindow(hwnd: number): WindowControl
}

export const WindowControl = require('bindings')('win-control').Window as WindowStatic

// Used when calling to setShowStatus as 2 argument. For more information see:
// https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-showwindow
export const WindowStates = Object.freeze({
  HIDE: 0,
  SHOWNORMAL: 1,
  SHOWMINIMIZED: 2,
  MAXIMIZE: 3,
  SHOWMAXIMIZED: 3,
  SHOWNOACTIVATE: 4,
  SHOW: 5,
  MINIMIZE: 6,
  SHOWMINNOACTIVE: 7,
  SHOWNA: 8,
  RESTORE: 9,
  SHOWDEFAULT: 10,
  FORCEMINIMIZE: 11,
})

export const AncestorFlags = Object.freeze({
  PARENT: 1,
  ROOT: 2,
  ROOTOWNER: 3,
})

// Used when calling to setPosition as 2 argument. For more information see:
// https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowpos
export const HWND = Object.freeze({
  NOTOPMOST: -2,
  TOPMOST: -1,
  TOP: 0,
  BOTTOM: 1,
})

// Used when calling to setPosition as 7 argument. For more information see:
// https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowpos
export const SWP = Object.freeze({
  NOSIZE: 0x0001,
  NOMOVE: 0x0002,
  NOZORDER: 0x0004,
  NOREDRAW: 0x0008,
  NOACTIVATE: 0x0010,
  DRAWFRAME: 0x0020,
  FRAMECHANGED: 0x0020,
  SHOWWINDOW: 0x0040,
  HIDEWINDOW: 0x0080,
  NOCOPYBITS: 0x0100,
  NOOWNERZORDER: 0x0200,
  NOREPOSITION: 0x0200,
  NOSENDCHANGING: 0x0400,
  DEFERERASE: 0x2000,
  ASYNCWINDOWPOS: 0x4000,
})
