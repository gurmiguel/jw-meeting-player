import { ParsingResult } from '../types'
import { CrawlerParser } from './CrawlerParser'

export class SchoolMediaParser extends CrawlerParser {
  private static GROUP = 'Faça seu Melhor no Ministério'

  async process(doc: Document) {
    const $root = doc.querySelector('#section3')

    if (!$root) return null

    const $anchors = Array.from($root.querySelectorAll<HTMLAnchorElement>('.pGroup > ul > li a') ?? [])

    const $videoAnchors = $anchors.filter($anchor => {
      return $anchor.matches('[data-video],[href*="data-video="]')
    })

    const media = await Promise.all($videoAnchors.map<Promise<ParsingResult | null>>(async $anchor => {
      const dataVideo = this.utils.parseAnchorDataVideo($anchor as HTMLAnchorElement)

      if (!dataVideo) return null

      const video = await this.utils.fetchPublicationVideo(dataVideo)

      if (!video) return null

      return {
        group: SchoolMediaParser.GROUP,
        type: 'video',
        label: $anchor.text.trim() ?? video.path.split('/').pop() ?? '',
        media: [
          { path: video.path, type: 'video' },
          { path: video.thumbnail!, type: 'image' },
        ],
      }
    }))

    const FIRST_ORDERED_NODE_TYPE = 9
    const $discourse = doc.evaluate('.//*[contains(text(),"Discurso:")]/following-sibling::a', $root, null, FIRST_ORDERED_NODE_TYPE).singleNodeValue as HTMLAnchorElement | null

    if ($discourse) {
      const discourseMedia = await this.utils.fetchArticleMedia($discourse.href)
      media.push(...discourseMedia.map(media => ({
        ...media,
        group: `${SchoolMediaParser.GROUP} :: (${$discourse.text}) ${media.group}`,
      })))
    }

    const nonNullableMedia = media.filter(Boolean) as NonNullableObject<typeof media>

    return nonNullableMedia
  }
}
