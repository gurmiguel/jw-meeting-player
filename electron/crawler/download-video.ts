import downloader from './Downloader'

export async function downloadVideo(url: string) {
  const path = await downloader.enqueue(url, 'mp4')

  console.log(`From URL: ${url}`)
  console.log(`Downloading Video to path: ${path}`)

  return path
}