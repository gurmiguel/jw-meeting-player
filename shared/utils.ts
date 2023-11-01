export function fileURL(url: string) {
  return 'file://' + url.replace(/\\/g, '/')
}

export function delay(timeInMilliseconds?: number) {
  return new Promise<void>(res => setTimeout(res, timeInMilliseconds))
}
