import { getWeek as fnsGetWeek, intervalToDuration, subDays } from 'date-fns'

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
    (minutes ?? 0).toString(),
    (seconds ?? 0).toString(),
  ]
    .filter(Boolean)
    .map(it => String(it).padStart(2, '0'))
    .join(':')
}

export function getWOLUrl(date: Date) {
  return `https://wol.jw.org/pt/wol/meetings/r5/lp-t/${date.getFullYear()}/${getWeek(date)}`
}

export function getWeek(date: number | Date) {
  date = new Date(date)

  return date.getMonth() < 11
    ? fnsGetWeek(date)
    : fnsGetWeek(subDays(date, 7)) + 1
}

export class Deferred<V = void> {
  resolve!: (value: V | PromiseLike<V>) => void
  reject!: (reason?: any) => void

  private promise = new Promise<V>((resolve, reject) => {
    this.resolve = resolve
    this.reject = reject
  })

  unwrap() {
    return this.promise
  }
}
