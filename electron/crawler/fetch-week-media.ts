import { addMinutes, format as formatDate, isWeekend } from 'date-fns'
import { CheerioAPI } from 'cheerio'
import { crawl } from './utils'
import { fetchPublicationVideo } from './fetch-publication-video'
import { MediaData, fetchArticle } from './fetch-article'
import downloader from './Downloader'

export async function fetchWeekMedia(date: Date) {
  date = addMinutes(date, date.getTimezoneOffset())
  const jwURL = `https://wol.jw.org/pt/wol/meetings/r5/lp-t/${formatDate(date, 'yyyy\/w')}`

  const { $ } = await crawl(jwURL)

  const baseURL = new URL(jwURL).origin

  try {
    if (isWeekend(date)) {
      downloader.setContext(formatDate(date, 'yyyy-w') + ' - 2')
  
    } else {
      downloader.setContext(formatDate(date, 'yyyy-w') + ' - 1')
      return await fetchMidWeekMeetingMedia($, baseURL)
    }
  } finally {
    await downloader.flush()
  }
}

async function fetchMidWeekMeetingMedia($: CheerioAPI, baseURL: string) {
  const $root = $('.todayItem.pub-mwb')

  const $initialSong = $root.find('#section1 ul > li:first-child a')
  const initialSong = parseInt($initialSong.text().replace(/\D/g, ''))

  const $midSong = $root.find('#section4 ul > li:first-child a')
  const midSong = parseInt($midSong.text().replace(/\D/g, ''))

  const $finalSong = $root.find('#section4 ul > li:last-child a')
  const finalSong = parseInt($finalSong.text().replace(/\D/g, ''))

  const songsPids = [$initialSong, $midSong, $finalSong].map($el => {
    return $el.parentsUntil('[data-pid]').attr('data-pid')
  })

  const songs = await Promise.all([
    fetchPublicationVideo(`pub-sjjm_${initialSong}_VIDEO`),
    fetchPublicationVideo(`pub-sjjm_${midSong}_VIDEO`),
    fetchPublicationVideo(`pub-sjjm_${finalSong}_VIDEO`),
  ])

  // TREASURES CONTENT
  const $discourses = $root.find('#section2, #section4').find('.pGroup ul > li > p > a')
    .filter((_, el) => {
      const $anchor = $(el)
      const href = $anchor.attr('href')!
  
      const $parent = $anchor.parentsUntil('[data-pid]').first()
      const pid = $parent.attr('data-pid')
  
      if (songsPids.includes(pid)) // exclude already fetched songs
        return false
      
      if (href.includes('/wol/bc/')) // exclude bible texts
        return false
  
      const articleOnlyRegex = new RegExp(`\\W*${$anchor.text()}\\W*:`)
  
      if (!articleOnlyRegex.test($parent.text().trim())) // only crawl articles for images
        return false

      return true
    })

  const media: Array<{ name: string, images: MediaData[], videos: MediaData[] }> = (await Promise.all($discourses.map(async (_, el) => {
    const $anchor = $(el)
    const href = $anchor.attr('href')!

    const fullHref = href.startsWith('/') ? baseURL + href : href
    
    const media = await fetchArticle(fullHref)

    return {
      name: $anchor.text().trim(),
      ...media,
    }
  }).get())).filter(Boolean)

  console.log(
    'Downloading media',
    media.map(({ name, images, videos }) => ({
      name,
      images: images.length,
      videos: videos.length,
    }))
  )

  const $videos = $root.find('a[data-video]')

  const videos: MediaData[] = await Promise.all($videos.map(async (_, el) => {
    const $anchor = $(el)
    const href = $anchor.attr('href')!

    const fullHref = href.startsWith('/') ? baseURL + href : href
    const pubIdentifier = new URL(fullHref).searchParams.get('lank')!

    const path = await fetchPublicationVideo(pubIdentifier)

    return { src: href, alt: $anchor.text().trim(), localPath: path }
  }).get())

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
