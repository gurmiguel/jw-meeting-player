
export function getFilename(filepath: string) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return filepath.replace(/\\/g, '/').split('/').pop()!
}
