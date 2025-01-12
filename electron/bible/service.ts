import log from 'electron-log/main'
import { MediaTypes } from '../../shared/models/MediaTypes'
import Downloader from '../api/Downloader'
import { CrawlerHandler } from '../api/crawler/CrawlerHandler'
import { BibleParser } from '../api/crawler/parsers/BibleParser'
import { ParsingResult } from '../api/crawler/types'
import { JWApiUrlBuilder } from '../utils/jw-api'

export type FetchBibleIndex = Map<number, { bookName: string, chapters: Map<number, Map<number, { startTime: string, duration: string }>> }>

export class BibleService {
  async fetchAllBooks() {
    const lang  = 'T'

    const apiURL = new JWApiUrlBuilder('T')
      .setFileFormat('mp3')
      .setPub('nwt')
      .build()
  
    const data = await fetch(apiURL).then(res => res.json())
  
    const index = new Map() as FetchBibleIndex
  
    for (const file of data.files[lang].MP3) {
      const { title, track: chapter, booknum, markers } = file
  
      let book = index.get(booknum)
      if (!book) {
        book = { bookName: this.getBookNameFromChapterTitle(title), chapters: new Map() }
        index.set(booknum, book)
      }
  
      book.chapters.set(
        chapter,
        new Map((markers?.markers as any[] ?? []).map((verse) => [
          verse.verseNumber,
          { startTime: verse.startTime, duration: verse.duration },
        ])),
      )
    }
  
    return index
  }

  async fetchVersesText(booknum: number, chapter: number, verses: number[]) {
    const url = new URL(`https://wol.jw.org/pt/wol/b/r5/lp-t/nwtsty/${booknum}/${chapter}#study=discover`)

    const downloader = new Downloader()
    downloader.setContext('bible')

    const handler = new CrawlerHandler(url.href, downloader)

    handler.addParser(new BibleParser(booknum, chapter, verses))
    
    const [result] = await handler.process()

    return result as Exclude<ParsingResult, { type: Exclude<MediaTypes, 'text'> }>
  }

  protected getBookNameFromChapterTitle(title: string) {
    const [ bookName ] = title.match(/^[\d\p{L}\s)(]+(?=\s(?:-\scap.tulo|\d+))/ui) ?? []
  
    if (!bookName)
      log.warn('Can\'t find book name for title', title)
  
    return bookName ?? ''
  }
}
