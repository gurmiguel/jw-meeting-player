import { CheerioAPI } from 'cheerio'
import { addMinutes, format as formatDate } from 'date-fns'
import { FetchWeekType } from '../../shared/models/FetchWeekData'
import downloader from './Downloader'
import { fetchArticle } from './fetch-article'
import { fetchPublicationVideo } from './fetch-publication-video'
import { crawl } from './utils'

export async function fetchWeekMedia(date: Date, type: FetchWeekType) {
  date = addMinutes(date, date.getTimezoneOffset())
  const jwURL = `https://wol.jw.org/pt/wol/meetings/r5/lp-t/${formatDate(date, 'yyyy\/w')}`

  const { $ } = await crawl(jwURL)

  const baseURL = new URL(jwURL).origin

  try {
    console.log('Fetching from:', jwURL)

    downloader.setContext(formatDate(date, 'yyyy-w') + ` - ${type + 1}`)
    switch (type) {
      case FetchWeekType.MIDWEEK:
        return await fetchMidWeekMeetingMedia($, baseURL)
      case FetchWeekType.WEEKEND:
        return await []
    }
  } finally {
    await downloader.flush()
  }
}

interface Media {
  type: string
  path: string
  thumbnail: string
}

async function fetchMidWeekMeetingMedia($: CheerioAPI, baseURL: string): Promise<Media[]> {
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
  
      const $parent = $anchor.closest('[data-pid]')
      const pid = $parent.attr('data-pid')
  
      if (songsPids.includes(pid)) // exclude already fetched songs
        return false
      
      if (href.includes('/wol/bc/')) // exclude bible texts
        return false
  
      const articleOnlyRegex = new RegExp(`“?\\W*${$anchor.text()}\\W*”?:`)
  
      if (!articleOnlyRegex.test($parent.text().trim())) // only crawl articles for images
        return false

      return true
    })

  const media = (await Promise.all($discourses.map(async (_, el) => {
    const $anchor = $(el)
    const href = $anchor.attr('href')!

    const fullHref = href.startsWith('/') ? baseURL + href : href
    
    const media = await fetchArticle(fullHref)

    return {
      name: $anchor.text().trim(),
      ...media,
    }
  }).get())).flatMap(data => {
    return [
      ...data.images.map(x => ({ path: x.path, thumbnail: x.thumbnail, type: 'image' })),
      ...data.videos.map(x => ({ path: x.path, thumbnail: x.thumbnail, type: 'video' })),
    ]
  }).filter(Boolean)

  const $videos = $root.find('a[data-video]')

  const videos = await Promise.all($videos.map(async (_, el) => {
    const $anchor = $(el)
    const href = $anchor.attr('href')!

    const fullHref = href.startsWith('/') ? baseURL + href : href
    const pubIdentifier = new URL(fullHref).searchParams.get('lank')!

    return await fetchPublicationVideo(pubIdentifier)
  }).get())

  return [
    ...songs,
    ...media,
    ...videos,
  ]
}
