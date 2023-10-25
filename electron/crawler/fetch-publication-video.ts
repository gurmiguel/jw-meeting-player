import { downloadVideo } from './download-video'

export async function fetchPublicationVideo(pubIdentifier: string) {
  const data = await fetch(`https://b.jw-cdn.org/apis/mediator/v1/media-items/T/${pubIdentifier}`)
    .then(res => res.json())

  const fileData = data.media[0].files.find((file: any) => file.label === '720p')

  const downloadURL = fileData.progressiveDownloadURL
  
  return {
    ...await downloadVideo(downloadURL),
    type: 'video',
  }
}