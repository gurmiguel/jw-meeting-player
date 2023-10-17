import { JSDOM } from 'jsdom'
import { addMinutes, format as formatDate, isWeekend } from 'date-fns'
import { crawl } from './utils'
import { fetchPublicationVideo } from './fetch-publication-video'
import { MediaData, fetchArticle } from './fetch-article'
import downloader from './Downloader'

export async function fetchWeekMedia(date: Date) {
  date = addMinutes(date, date.getTimezoneOffset())

  const jwURL = `https://wol.jw.org/pt/wol/meetings/r5/lp-t/${formatDate(date, 'yyyy\/w')}`

  const dom = await crawl(jwURL)

  const baseURL = new URL(jwURL).origin

  try {
    if (isWeekend(date)) {
      downloader.setContext(formatDate(date, 'yyyy-w') + ' - 2')
  
    } else {
      downloader.setContext(formatDate(date, 'yyyy-w') + ' - 1')
      return await fetchMidWeekMeetingMedia(dom, baseURL)
    }
  } finally {
    await downloader.flush()
  }
}

async function fetchMidWeekMeetingMedia(dom: JSDOM, baseURL: string) {
  const $root = dom.window.document.querySelector('.todayItem.pub-mwb')

  const $initialSong = $root?.querySelector('#section1 ul > li:first-child a')
  const initialSong = parseInt($initialSong?.textContent?.replace(/\D/g, '') ?? '')

  const $midSong = $root?.querySelector('#section4 ul > li:first-child a')
  const midSong = parseInt($midSong?.textContent?.replace(/\D/g, '') ?? '')

  const $finalSong = $root?.querySelector('#section4 ul > li:last-child a')
  const finalSong = parseInt($finalSong?.textContent?.replace(/\D/g, '') ?? '')

  const songsPids = [$initialSong, $midSong, $finalSong].map<string>($el => {
    return $el?.closest('[data-pid]')?.getAttribute('data-pid') ?? ''
  })

  const songs = await Promise.all([
    fetchPublicationVideo(`pub-sjjm_${initialSong}_VIDEO`),
    fetchPublicationVideo(`pub-sjjm_${midSong}_VIDEO`),
    fetchPublicationVideo(`pub-sjjm_${finalSong}_VIDEO`),
  ])

  // TREASURES CONTENT
  const $discourses = Array.from($root?.querySelector('#section2, #section4')?.querySelectorAll('.pGroup ul > li > p > a') ?? [])
    .filter($anchor => {
      const href = $anchor.getAttribute('href')!
  
      const $parent = $anchor.closest('[data-pid]')
      if (!$parent)
        return false
      const pid = $parent.getAttribute('data-pid') ?? ''
  
      if (songsPids.includes(pid)) // exclude already fetched songs
        return false
      
      if (href.includes('/wol/bc/')) // exclude bible texts
        return false
  
      const articleOnlyRegex = new RegExp(`\\W*${$anchor.textContent}\\W*:`)
  
      if (!articleOnlyRegex.test($parent.textContent?.trim() ?? '')) // only crawl articles for images
        return false

      return true
    })

  const media = (await Promise.all($discourses.map<Promise<{ name: string, images: MediaData[], videos: MediaData[] }>>(async ($anchor) => {
    const href = $anchor.getAttribute('href')!

    const fullHref = href.startsWith('/') ? baseURL + href : href
    
    const media = await fetchArticle(fullHref)

    return {
      name: $anchor.textContent?.trim() ?? '',
      ...media,
    }
  }))).filter(Boolean)

  console.log(
    'Downloading media',
    media.map(({ name, images, videos }) => ({
      name,
      images: images.length,
      videos: videos.length,
    }))
  )

  const $videos = Array.from($root?.querySelectorAll('a[data-video]') ?? [])

  const videos: MediaData[] = await Promise.all($videos.map(async ($anchor) => {
    const href = $anchor.getAttribute('href')!

    const fullHref = href.startsWith('/') ? baseURL + href : href
    const pubIdentifier = new URL(fullHref).searchParams.get('lank')!

    const path = await fetchPublicationVideo(pubIdentifier)

    return { src: href, alt: $anchor.textContent?.trim() ?? '', localPath: path }
  }))

  console.log(
    'Downloading Videos',
    videos
  )

  return [
    ...songs,
    ...media,
    ...videos,
  ]
}
