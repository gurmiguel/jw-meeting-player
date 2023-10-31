import { type Downloader } from '../../Downloader'
import { CrawlerHandler } from '../CrawlerHandler'
import { ArticleMediaParser } from './ArticleMediaParser'

export class CrawlerUtils {
  constructor(protected downloader: Downloader) {}

  parseAnchorDataVideo($anchor: HTMLAnchorElement) {
    const dataVideo = $anchor.getAttribute('data-video')
    if (dataVideo) 
      return dataVideo

    const href = $anchor.href

    if (!href) return null

    const params = new URL(href).searchParams

    return params.get('data-video') ?? null
  }

  generateDataVideoURL(pub: string, track: string | number, issue?: string | number) {
    const url = new URL('webpubvid://')

    url.searchParams.set('pub', pub)
    url.searchParams.set('track', track.toString())
    if (issue)
      url.searchParams.set('issue', issue.toString())

    return url.href
  }

  async fetchPublicationVideo(dataVideo: string) {
    const params = new URL(dataVideo).searchParams
    const pub = params.get('pub')
    const track = params.get('track')
    const issue = params.get('issue')

    if (!pub || !track) return null

    const pubmediaEndpoint = new URL('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS')
    pubmediaEndpoint.searchParams.set('output', 'json')
    pubmediaEndpoint.searchParams.set('fileformat', 'mp4')
    pubmediaEndpoint.searchParams.set('alllangs', '0')
    pubmediaEndpoint.searchParams.set('langwritten', 'T')
    pubmediaEndpoint.searchParams.set('pub', pub)
    pubmediaEndpoint.searchParams.set('track', track)
    if (issue)
      pubmediaEndpoint.searchParams.set('issue', issue)

    const data = await fetch(pubmediaEndpoint.href)
      .then(res => res.json())
    
    const files = data?.files?.T?.MP4
      ?.sort((a: any, b: typeof a) => parseInt(b.label) - parseInt(a.label)) ?? []

    const downloadURL = files[0]?.file?.url
    const title = files[0]?.title as string ?? ''

    if (!downloadURL) return null

    const downloadingMedia = await this.download(downloadURL, 'mp4')
    
    return { ...downloadingMedia, title }
  }

  async fetchArticleMedia(url: string, types?: ArticleMediaParser['types']) {
    const handler = new CrawlerHandler(url, this.downloader)

    handler.addParser(new ArticleMediaParser(types ?? ['image', 'video']))

    return await handler.process()
  }

  download: Downloader['enqueue'] = (...args) => this.downloader.enqueue(...args)
}
