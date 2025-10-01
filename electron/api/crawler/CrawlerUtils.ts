import { error, warn } from 'electron-log/main'
import { type JSDOM } from 'jsdom'
import { MAX_VIDEO_DURATION } from '../../../shared/constants'
import { JWApiUrlBuilder } from '../../utils/jw-api'
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

    const apiurlBuilder = new JWApiUrlBuilder('T')
      .setFileFormat('mp4')
      .setTrack(track)

    if (pub)
      apiurlBuilder.setPub(pub)
    if (docid)
      apiurlBuilder.setDocId(docid)
    if (issue)
      apiurlBuilder.setIssue(issue)

    const pubmediaEndpoint = apiurlBuilder.build()

    const data = await fetch(pubmediaEndpoint.href)
      .then(res => res.json())
    
    const files = data?.files?.T?.MP4
      ?.sort((a: any, b: typeof a) => parseInt(b.label) - parseInt(a.label)) ?? []

    const downloadURL = files[0]?.file?.url
    if (!downloadURL) return null

    const title = files[0]?.title as string ?? ''
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

  static async parseDocument(url: string): Promise<Document> {
    const { window: { document } }: JSDOM = await require('jsdom').JSDOM.fromURL(url)

    return document
  }

  static async parseHref($anchor: HTMLAnchorElement | null): Promise<string | null> {
    if (!$anchor) return null

    const href = $anchor.getAttribute('href') || null

    if (!href || href.startsWith('http'))
      return href

    const baseHref = new URL($anchor.ownerDocument.baseURI).origin

    return [
      baseHref.replace(/\/$/, ''),
      href.replace(/^\//, ''),
    ].join('/')
  }
}
