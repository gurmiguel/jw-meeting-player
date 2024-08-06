import log from 'electron-log/main'
import { type JSDOM } from 'jsdom'
import { isEqual, uniqWith } from 'lodash'
import { type Downloader } from '../Downloader'
import { CrawlerUtils } from './CrawlerUtils'
import { CrawlerParser } from './parsers/CrawlerParser'
import { ProcessedResult } from './types'

export class CrawlerHandler {
  private utils: CrawlerUtils
  private parsers = new Array<CrawlerParser>()

  constructor(protected url: string, protected downloader: Downloader, protected loadedIds = new Array<string>()) {
    this.utils = new CrawlerUtils(downloader, this.loadedIds)
  }

  private get baseURL() {
    return new URL(this.url).origin
  }

  addParser(parser: CrawlerParser) {
    parser.setBaseURL(this.baseURL)
    parser.setUtils(this.utils)
    this.parsers.push(parser)

    return this
  }

  async process(): Promise<ProcessedResult[]> {
    log.info('Fetching from:', this.url)

    const { window: { document: doc } }: JSDOM = await require('jsdom').JSDOM.fromURL(this.url)
    
    const pageId = await this.getPageId(doc)
    if (!await this.isElligible(pageId))
      return []


    this.loadedIds.push(pageId)

    const $result = (await Promise.all(this.parsers.map(async parser => {
      const parsedResult = await parser.process(doc)
        .catch(err => {
          log.error('Error parsing result', err)
          throw err
        })

      return parsedResult?.map(res => ({
        ...res,
        manual: false,
      }))
    }))).flat()

    const result = $result.filter(Boolean) as NonNullableObject<typeof $result>

    return uniqWith(result, isEqual)
  }

  async isElligible(pageId: string): Promise<boolean> {
    if (this.loadedIds.includes(pageId)) {
      log.info('Duplicate page skipped', this.url, pageId)
      return false
    }

    const url = new URL(this.url.toLowerCase())
    if (url.href.match(/www.jw.org\/finder/i)) {
      if (!url.searchParams.has('docid') && !url.searchParams.has('issue')) {
        log.info('Full pub skipped', this.url, pageId)
        return false
      }
    }

    return true
  }

  async getPageId(doc: Document) {
    if (!doc.location.origin.match(/wol.jw.org/i)) return doc.location.href

    const pageInputNames = ['contentRsconf','contentLib','contentLibLangSym','contentLibLangScript','site']
    const pubInputNames = ['englishSym','chapNo','docId']

    const inputs = Array.from(doc.querySelectorAll<HTMLInputElement>(
      [...pageInputNames,...pubInputNames].map(name => `input[id="${name}"]`).join(','),
    ))

    const inputPairs = inputs.map(it => [it.id, it.value].join(':'))

    if (doc.querySelector<HTMLInputElement>('input[id="shareType"]')?.value === 'meetings') {
      const [,docId] = doc.querySelector('.todayItem, .pub-mwb')?.className.split(' ').find(cls => cls.match(/docId-.*/i))
        ?.split('-') ?? ['',doc.location.pathname.split('/').pop()]
      inputPairs.push(
        'englishSym:mwb',
        'chapNo:-1',
        `docId:${docId}`,
      )
    }
    
    return inputPairs.sort().join('--')
  }
}
