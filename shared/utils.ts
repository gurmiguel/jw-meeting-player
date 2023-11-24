import { intervalToDuration } from 'date-fns'

export function fileURL(url: string) {
  return 'file://' + url.replace(/\\/g, '/')
}

export function fileLocalPath(url: string) {
  return url.replace(/file:\/\//g, '')
}

export function delay(timeInMilliseconds?: number) {
  return new Promise<void>(res => setTimeout(res, timeInMilliseconds))
}

export function formatDuration(duration: number) {
  const { hours, minutes, seconds } = intervalToDuration({ start: 0, end: duration * 1000 })

  return [
    hours,
    minutes,
    seconds,
  ]
    .filter(Boolean)
    .map(it => String(it).padStart(2, '0'))
    .join(':')
}
