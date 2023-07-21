export function delay(timeInMilliseconds?: number) {
  return new Promise<void>(res => setTimeout(res, timeInMilliseconds))
}
