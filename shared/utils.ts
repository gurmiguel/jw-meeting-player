export function fileURL(url: string) {
  return 'file://' + url.replace(/\\/g, '/')
}
