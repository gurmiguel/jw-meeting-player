import { addMinutes, format as formatDate } from 'date-fns'
import { isEqual, unionWith } from 'lodash'
import { WeekType } from '../../shared/models/WeekType'
import { Downloader } from './Downloader'
import MetadataLoader from './MetadataLoader'
import { CrawlerHandler } from './parser/CrawlerHandler'
import { ChristianLifeMediaParser } from './parser/parsers/ChristianLifeMediaParser'
import { SchoolMediaParser } from './parser/parsers/SchoolMediaParser'
import { SongsParser } from './parser/parsers/SongsParser'
import { TreasuresMediaParser } from './parser/parsers/TreasuresMediaParser'
import { WeekendParser } from './parser/parsers/WeekendParser'
import { ProcessedResult } from './parser/types'

// pnpm run -s script "./electron/api/fetch-week-media.ts" "fetchWeekMedia" "new Date('$(date)')" "0"

export async function fetchWeekMedia(date: Date, type: WeekType, force = false) {
  date = addMinutes(date, date.getTimezoneOffset())

  console.log('Fetching data for date:', formatDate(date, 'yyyy-MM-dd'), 'and type:', WeekType[type])
  if (force)
    console.log('-- Fetching with force enabled')
  
  const downloader = new Downloader()
  downloader.setContext(formatDate(date, 'yyyy-w') + `--${type + 1}`)

  const jwURL = `https://wol.jw.org/pt/wol/meetings/r5/lp-t/${formatDate(date, 'yyyy\/w')}`
  
  const metadataLoader = new MetadataLoader(downloader)
  const loadedMetadata = await metadataLoader.loadMetadata(force)
  let parsingResult: ProcessedResult[] | null = loadedMetadata
  try {
    if (!parsingResult || force) {
      switch (type) {
        case WeekType.MIDWEEK:
          parsingResult = await fetchMidWeekMeetingMedia(jwURL, downloader)
          break
        case WeekType.WEEKEND:
          parsingResult = await fetchWeekendMeetingMedia(jwURL, downloader)
          break
      }
    }
  } finally {
    console.log('Starting to download')
    const count = await downloader.flush()
    console.log(`Downloaded ${count} media items`)
  }
  const mergedResults = unionWith(parsingResult, loadedMetadata, (a, b) => {
    return isEqual(a, b)
  })
  if (mergedResults.length > 0)
    await metadataLoader.saveMetadata(mergedResults)

  return mergedResults
}

async function fetchMidWeekMeetingMedia(url: string, downloader: Downloader) {
  const handler = new CrawlerHandler(url, downloader)
  
  handler.addParser(new SongsParser())
  handler.addParser(new TreasuresMediaParser())
  handler.addParser(new SchoolMediaParser())
  handler.addParser(new ChristianLifeMediaParser())

  const results = await handler.process()

  return results
}

async function fetchWeekendMeetingMedia(url: string, downloader: Downloader) {
  const handler = new CrawlerHandler(url, downloader)
  
  handler.addParser(new WeekendParser())

  const results = await handler.process()

  return results
}