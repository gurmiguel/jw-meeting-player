import { ParsingResult } from '../types'
import { CrawlerParser } from './CrawlerParser'

export class TreasuresMediaParser extends CrawlerParser {
  private static GROUP = 'Tesouros da Palavra de Deus'

  async process(doc: Document) {
    const $root = doc.querySelector('#section2')

    if (!$root) return null

    const $partsList = $root.querySelector('.pGroup > ul')

    const firstPartUrl = $partsList?.querySelector('a')?.href

    const media = new Array<ParsingResult>()

    if (firstPartUrl) {
      const firstPartMedia = await this.utils.fetchArticleMedia(firstPartUrl)

      media.push(...firstPartMedia.map(media => ({
        ...media,
        group: `${TreasuresMediaParser.GROUP} :: ${media.group}`,
      })))
    }

    return media
  }
}
