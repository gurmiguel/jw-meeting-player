import log from 'electron-log/main'
import { nanoid } from 'nanoid'
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
        case 'video': return 'a[data-video], a[href*="data-video="], video'
        default: return null
      }
    }).filter(Boolean).join(', ')

    const $mediaItems = Array.from($root.querySelectorAll<(HTMLImageElement & { tagName: 'IMG' }) | (HTMLAnchorElement & { tagName: 'A' }) | (HTMLVideoElement & { tagName: 'VIDEO' })>(selectors) ?? [])

    const media = await Promise.all($mediaItems.map(async ($el, index): Promise<ParsingResult | null> => {
      switch ($el.tagName) {
        case 'IMG':
          const image = await this.processArticleImage($el, index)
          if (!image) return null
          return {
            group: articleTitle,
            type: 'image',
            ...image,
          }
        case 'A':
          const anchorVideo = await this.processArticleVideoAnchor($el)
          if (!anchorVideo) return null
          return {
            group: articleTitle,
            type: 'video',
            ...anchorVideo,
          }
        case 'VIDEO':
          const video = await this.processArticleVideo($el, new URL(doc.baseURI).origin)
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

  protected async processArticleImage($img: HTMLImageElement, index: number): Promise<Omit<ParsingResult, 'group' | 'type'> | null> {
    if ($img.closest('.alternatePresentation')) return null
    if ($img.closest('a[data-video], a[href*="data-video="]')) return null

    const src = $img.getAttribute('src')
    const alt = $img.getAttribute('alt') || `Imagem ${index + 1}`
    const caption = $img.closest('figure')?.querySelector('figcaption')?.textContent?.trim() ?? alt

    if (!src) return null

    const fullSrc = src.startsWith('/') ? this.baseURL + src : src

    const format = src.split('/').pop()?.includes('.')
      ? src.split('.').pop()
      : null

    const { path } = await this.utils.download(fullSrc, format ?? 'jpeg')

    return {
      uid: nanoid(),
      media: [ { path, type: 'image', timestamp: Date.now(), downloadProgress: 0 } ],
      alt,
      label: caption,
    }
  }

  protected async processArticleVideoAnchor($anchor: HTMLAnchorElement): Promise<Omit<ParsingResult, 'group' | 'type'> | null> {
    const dataVideo = this.utils.parseAnchorDataVideo($anchor as HTMLAnchorElement)

    if (!dataVideo) return null

    const video = await this.utils.fetchPublicationVideo(dataVideo)

    if (!video) return null

    return {
      uid: nanoid(),
      label: video.title,
      alt: video.title,
      media: [
        { path: video.path, type: 'video', timestamp: Date.now(), duration: video.duration, downloadProgress: 0 },
        { path: video.thumbnail!, type: 'image', timestamp: Date.now(), downloadProgress: 0 },
      ],
    }
  }

  protected async processArticleVideo($video: HTMLVideoElement, baseURL: string): Promise<Omit<ParsingResult, 'group' | 'type'> | null> {
    const downloadURL = $video.getAttribute('data-json-src')

    if (!downloadURL) {
      log.warn('Video url was not found!', $video.outerHTML)
      return null
    }

    const $url = new URL(baseURL + '/' + downloadURL)

    const pub = $url.searchParams.get('pub')!!
    const track = $url.searchParams.get('track')!!

    const dataVideo = new URL('https://dummy.com/')
    dataVideo.searchParams.set('pub', pub)
    dataVideo.searchParams.set('track', parseInt(track).toString())

    const video = await this.utils.fetchPublicationVideo(dataVideo.toString())

    if (!video) return null

    return {
      uid: nanoid(),
      label: video.title,
      alt: video.title,
      media: [
        { path: video.path, type: 'video', duration: video.duration, timestamp: Date.now(), downloadProgress: 0 },
        { path: video.thumbnail!, type: 'image', timestamp: Date.now(), downloadProgress: 0 },
      ],
    }
  }
}
