import { crawl } from './utils'
import { downloadImage } from './download-image'
import { fetchPublicationVideo } from './fetch-publication-video'

export interface MediaData {
  src: string
  alt: string
  localPath: string
}

export async function fetchArticle(url: string) {
  const { $ } = await crawl(url)

  const $root = $('#article')

  const $images = $root.find('img')

  const baseURL = new URL(url).origin

  const images: MediaData[] = await Promise.all($images.map(async (_, el) => {
    const $image = $(el)
    const src = $image.attr('src')!
    const alt = $image.attr('alt')!

    const fullSrc = src.startsWith('/') ? baseURL + src : src
    const localPath = await downloadImage(fullSrc)

    return { src: fullSrc, alt, localPath }
  }).get())

  const $videos = $root.find('a[data-video]')

  const videos: MediaData[] = await Promise.all($videos.map(async (_, el) => {
    const $anchor = $(el)
    const href = $anchor.attr('href')!

    const fullHref = href.startsWith('/') ? baseURL + href : href
    const pubIdentifier = new URL(fullHref).searchParams.get('lank')!

    const path = await fetchPublicationVideo(pubIdentifier)

    return { src: href, alt: $anchor.text().trim(), localPath: path }
  }).get())

  return { images, videos }
}