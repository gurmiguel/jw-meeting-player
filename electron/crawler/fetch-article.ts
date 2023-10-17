import { crawl } from './utils'
import { downloadImage } from './download-image'
import { fetchPublicationVideo } from './fetch-publication-video'

export interface MediaData {
  src: string
  alt: string
  localPath: string
}

export async function fetchArticle(url: string) {
  const dom = await crawl(url)

  const $root = dom.window.document.querySelector('#article')!

  const $images = Array.from($root.querySelectorAll('img'))

  const baseURL = new URL(url).origin

  const images: MediaData[] = await Promise.all($images.map(async ($image) => {
    const src = $image.getAttribute('src')!
    const alt = $image.getAttribute('alt')!

    const fullSrc = src.startsWith('/') ? baseURL + src : src
    const localPath = await downloadImage(fullSrc)

    return { src: fullSrc, alt, localPath }
  }))

  const $videos = Array.from($root.querySelectorAll('a[data-video]'))

  const videos: MediaData[] = await Promise.all($videos.map(async ($anchor) => {
    const href = $anchor.getAttribute('href')!

    const fullHref = href.startsWith('/') ? baseURL + href : href
    const pubIdentifier = new URL(fullHref).searchParams.get('lank')!

    const path = await fetchPublicationVideo(pubIdentifier)

    return { src: href, alt: $anchor.textContent?.trim() ?? '', localPath: path }
  }))

  return { images, videos }
}