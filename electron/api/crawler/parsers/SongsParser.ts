import { padStart } from 'lodash'
import { nanoid } from 'nanoid/non-secure'
import { ParsingResult } from '../types'
import { CrawlerParser } from './CrawlerParser'

export class SongsParser extends CrawlerParser {
  static SONG_PUB_ID = 'sjjm'

  async process(doc: Document) {
    const $root = doc.querySelector('#article')

    if (!$root) return null

    const ORDERED_NODE_SNAPSHOT_TYPE = 7
    let $songs = doc.evaluate('//a[contains(., "CÂNTICO")]', $root, null, ORDERED_NODE_SNAPSHOT_TYPE)
    if ($songs.snapshotLength === 0)
      $songs = doc.evaluate('//a[contains(., "Cântico")]', $root, null, ORDERED_NODE_SNAPSHOT_TYPE)
    if ($songs.snapshotLength === 0)
      $songs = doc.evaluate('//a[contains(., "cântico")]', $root, null, ORDERED_NODE_SNAPSHOT_TYPE)

    const songs = new Array<number>()
    let $song: Node | null
    for (let i = 0; ($song = $songs.snapshotItem(i)) !== null; i++) {
      const song = parseInt($song?.textContent?.replace(/\D/g, '') ?? 'NaN')
      if (!Number.isNaN(song))
        songs.push(song)
    }

    const songsVideos = await Promise.all(songs.map(async song => {
      return {
        song,
        ...await this.utils.fetchPublicationVideo(this.utils.generateDataVideoURL(SongsParser.SONG_PUB_ID, song)),
      }
    }))

    const filteredSongsVideos = songsVideos.filter(it => !!it.path) as Array<Required<ArrayType<typeof songsVideos>>>

    return filteredSongsVideos.map<ParsingResult>((it) => {
      const label = SongsParser.parseSongLabel(it.song, it.title)
      return {
        uid: nanoid(),
        group: 'Cânticos',
        label,
        alt: label,
        media: [
          { path: it.path, type: 'video', duration: it.duration, timestamp: Date.now(), downloadProgress: 0 },
          { path: it.thumbnail!, type: 'image', timestamp: Date.now(), downloadProgress: 0 },
        ],
        type: 'video',
      }
    })
  }

  static parseSongLabel(song: number, label: string) {
    return `Cântico ${label.replace(new RegExp(`^${song}\.\s*`), padStart(song.toString(), 2, '0') + ' - ')}`
  }
}
