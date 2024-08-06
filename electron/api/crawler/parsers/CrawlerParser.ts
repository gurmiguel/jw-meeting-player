import { CrawlerUtils } from '../CrawlerUtils'
import { ParsingResult } from '../types'

export abstract class CrawlerParser {
  protected baseURL!: string
  protected utils!: CrawlerUtils

  setBaseURL(baseURL: string) {
    this.baseURL = baseURL
  }

  setUtils(utils: CrawlerUtils) {
    this.utils = utils
  }
  
  abstract process(doc: Document): Promise<ParsingResult[] | null>
}
