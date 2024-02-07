import { MediaTypes } from '../../../../shared/models/MediaTypes'
import { ParsingResult } from '../types'
import { CrawlerParser } from './CrawlerParser'

export class ArticleMediaParser extends CrawlerParser {
  constructor(protected types: Exclude<MediaTypes, 'audio'>[]) {
    super()
  }

  async process(doc: Document) {
    const $root = doc.querySelector('#article')

    if (!$root) return null

    const articleTitle = $root.querySelector('h1')?.textContent?.trim() ?? doc.title.split('—').shift()!.trim()

    const selectors = this.types.map(type => {
      switch (type) {
        case 'image': return 'img'
        case 'video': return 'a[data-video], a[href*="data-video="]'
        default: return null
      }
    }).filter(Boolean).join(', ')

    const $mediaItems = Array.from($root.querySelectorAll<(HTMLImageElement & { tagName: 'IMG' }) | (HTMLAnchorElement & { tagName: 'A' })>(selectors) ?? [])

    const media = await Promise.all($mediaItems.map(async ($el): Promise<ParsingResult | null> => {
      switch ($el.tagName) {
        case 'IMG':
          const image = await this.processArticleImage($el)
          if (!image) return null
          return {
            group: articleTitle,
            type: 'image',
            ...image,
          }
        case 'A':
          const video = await this.processArticleVideo($el)
          if (!video) return null
          return {
            group: articleTitle,
            type: 'video',
            ...video,
          }
        default:
          return null
      }
    }))

    const nonNullableMedia = media.filter(Boolean) as NonNullableObject<typeof media>

    return nonNullableMedia
  }

  protected async processArticleImage($img: HTMLImageElement): Promise<Pick<ParsingResult, 'label' | 'media'> | null> {
    if ($img.closest('.alternatePresentation')) return null
    if ($img.closest('a[data-video], a[href*="data-video="]')) return null

    const src = $img.getAttribute('src')
    const alt = $img.getAttribute('alt') ?? ''

    if (!src) return null

    const fullSrc = src.startsWith('/') ? this.baseURL + src : src

    const format = src.split('/').pop()?.includes('.')
      ? src.split('.').pop()
      : null

    const { path } = await this.utils.download(fullSrc, format ?? 'jpeg')

    return {
      media: [ { path, type: 'image' } ],
      label: alt,
    }
  }

  protected async processArticleVideo($anchor: HTMLAnchorElement): Promise<Pick<ParsingResult, 'label' | 'media'> | null> {
    const dataVideo = this.utils.parseAnchorDataVideo($anchor as HTMLAnchorElement)

    if (!dataVideo) return null

    const video = await this.utils.fetchPublicationVideo(dataVideo)

    if (!video) return null

    return {
      label: video.title,
      media: [
        { path: video.path, type: 'video', duration: video.duration },
        { path: video.thumbnail!, type: 'image' },
      ],
    }
  }
}
