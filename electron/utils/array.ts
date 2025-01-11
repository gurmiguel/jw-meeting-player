export function* chunks<T>(array: T[], chunkSize: number) {
  for (let i = 0; i < array.length; i += chunkSize)
    yield array.slice(i, i + chunkSize)
}
