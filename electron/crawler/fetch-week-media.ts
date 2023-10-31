import { addMinutes, format as formatDate } from 'date-fns'
import { FetchWeekType } from '../../shared/models/FetchWeekData'
import downloader from './Downloader'
import { CrawlerHandler } from './parser/CrawlerHandler'
import { ChristianLifeMediaParser } from './parser/parsers/ChristianLifeMediaParser'
import { SchoolMediaParser } from './parser/parsers/SchoolMediaParser'
import { SongsParser } from './parser/parsers/SongsParser'
import { TreasuresMediaParser } from './parser/parsers/TreasuresMediaParser'

// pnpm run -s script "./electron/crawler/fetch-week-media.ts" "fetchWeekMedia" "new Date('$(date)')" "0"

export async function fetchWeekMedia(date: Date, type: FetchWeekType) {
  date = addMinutes(date, date.getTimezoneOffset())

  console.log('Fetching data for date:', formatDate(date, 'yyyy-MM-dd'))

  const jwURL = `https://wol.jw.org/pt/wol/meetings/r5/lp-t/${formatDate(date, 'yyyy\/w')}`

  try {
    downloader.setContext(formatDate(date, 'yyyy-w') + `--${type + 1}`)
    switch (type) {
      case FetchWeekType.MIDWEEK:
        return await fetchMidWeekMeetingMedia(jwURL)
      case FetchWeekType.WEEKEND:
        return await []
    }
  } finally {
    console.log('Starting to download')
    const count = await downloader.flush()
    console.log(`Downloaded ${count} media items`)
  }
}

async function fetchMidWeekMeetingMedia(url: string) {
  const handler = new CrawlerHandler(url, downloader)
  
  handler.addParser(new SongsParser())
  handler.addParser(new TreasuresMediaParser())
  handler.addParser(new SchoolMediaParser())
  handler.addParser(new ChristianLifeMediaParser())

  const results = await handler.process()

  return results
}
