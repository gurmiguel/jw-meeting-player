import log from 'electron-log/main'
import settings from 'electron-settings'
import { JWApiUrlBuilder } from '../utils/jw-api'
import { JWApiResponse, MediaResponse } from '../utils/jw-types'

export async function loadSongs() {
  const apiURL = new JWApiUrlBuilder('T')
    .setFileFormat('mp3')
    .setPub('sjjm')
    .build()

  try {
    const data: JWApiResponse<MediaResponse, 'MP3', 'T'> = await fetch(apiURL).then(res => res.json())
    
    const amountOfSongs = data.files.T.MP3
      .filter(it => !it.title.toLowerCase().includes('(com audiodescrição)'))
      .reduce((highestTrack, song) => {
        return Math.max(highestTrack, song.track)
      }, 0)

    await settings.set('songs.amount', amountOfSongs)

    return amountOfSongs
  } catch (ex) {
    log.error(ex)

    return Number(await settings.get('songs.amount') ?? '200')
  }
}
