import { error, warn } from 'electron-log/main'
import latinize from 'latinize'
import { MAX_VIDEO_DURATION } from '../../../shared/constants'
import { type Downloader } from '../Downloader'
import { CrawlerHandler } from './CrawlerHandler'
import { ArticleMediaParser } from './parsers/ArticleMediaParser'
import { SongsParser } from './parsers/SongsParser'

export class CrawlerUtils {
  constructor(protected downloader: Downloader, protected pageIds: Array<string>) {}

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
    const docid = params.get('docid')
    const track = params.get('track')
    const issue = params.get('issue')

    if ((!pub && !docid) || !track) {
      error('Could not load video, data-video parameter not valid', dataVideo)
      return null
    }

    const pubmediaEndpoint = new URL('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS')
    pubmediaEndpoint.searchParams.set('output', 'json')
    pubmediaEndpoint.searchParams.set('fileformat', 'mp4')
    pubmediaEndpoint.searchParams.set('alllangs', '0')
    pubmediaEndpoint.searchParams.set('langwritten', 'T')
    if (pub)
      pubmediaEndpoint.searchParams.set('pub', pub)
    if (docid)
      pubmediaEndpoint.searchParams.set('docid', docid)
    pubmediaEndpoint.searchParams.set('track', track)
    if (issue)
      pubmediaEndpoint.searchParams.set('issue', issue)

    const data = await fetch(pubmediaEndpoint.href)
      .then(res => res.json())
    
    const files = data?.files?.T?.MP4
      ?.sort((a: any, b: typeof a) => parseInt(b.label) - parseInt(a.label)) ?? []

    const downloadURL = files[0]?.file?.url
    if (!downloadURL) return null

    const title = latinize(files[0]?.title as string ?? '')
      .replace(/[^a-z0-9_\-\s\+]/gi, '')
      .replace(/\s+/g, ' ')
    const duration = Number(files[0]?.duration ?? 0)
    
    if (duration > MAX_VIDEO_DURATION) {
      warn('Video duration too long, will not download!', { downloadURL, title, duration })
      return null
    }

    const downloadingMedia = await this.download(downloadURL, 'mp4')
    
    return { ...downloadingMedia, title, duration }
  }

  async crawlUrl(url: string, addParsers: (handler: CrawlerHandler) => void, ignoreFetchedPages = false) {
    const handler = new CrawlerHandler(url, this.downloader, ignoreFetchedPages ? [] : this.pageIds)

    addParsers(handler)

    return await handler.process()
  }

  async fetchArticleMedia(url: string, types?: ArticleMediaParser['types']) {
    return this.crawlUrl(url, handler => {
      handler.addParser(new ArticleMediaParser(types ?? ['image', 'video']))
    })
  }

  async fetchSongsMedia(url: string) {
    return this.crawlUrl(url, handler => {
      handler.addParser(new SongsParser())
    }, true)
  }

  download: Downloader['enqueue'] = (...args) => this.downloader.enqueue(...args)
}
