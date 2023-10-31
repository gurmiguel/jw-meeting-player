import { padStart } from 'lodash'
import { ParsingResult } from '../types'
import { CrawlerParser } from './CrawlerParser'

export class SongsParser extends CrawlerParser {
  protected static SONG_PUB_ID = 'sjjm'

  async process(doc: Document) {
    const $root = doc.querySelector('.todayItem.pub-mwb')

    if (!$root) return null

    const $initialSong = $root.querySelector<HTMLAnchorElement>('#section1 ul > li:first-child a')
    const initialSong = parseInt($initialSong?.text?.replace(/\D/g, '') ?? 'NaN')

    const $midSong = $root.querySelector<HTMLAnchorElement>('#section4 ul > li:first-child a')
    const midSong = parseInt($midSong?.text?.replace(/\D/g, '') ?? 'NaN')

    const $finalSong = $root.querySelector<HTMLAnchorElement>('#section4 ul > li:last-child a')
    const finalSong = parseInt($finalSong?.text?.replace(/\D/g, '') ?? 'NaN')

    const songs = [
      initialSong, midSong, finalSong,
    ].filter(num => !Number.isNaN(num))

    const songsVideos = await Promise.all(songs.map(async song => {
      return {
        song,
        ...await this.utils.fetchPublicationVideo(this.utils.generateDataVideoURL(SongsParser.SONG_PUB_ID, song)),
      }
    }))

    const filteredSongsVideos = songsVideos.filter(it => !!it.path) as Array<Required<ArrayType<typeof songsVideos>>>

    return filteredSongsVideos.map<ParsingResult>((it) => {
      return {
        group: 'Cânticos',
        label: `Cântico ${padStart(it.song+'', 2, '0')}`,
        media: [
          { path: it.path, type: 'video' },
          { path: it.thumbnail, type: 'image' },
        ],
        type: 'video',
      }
    })
  }
}
