import downloader from './Downloader'

export async function downloadImage(url: string) {
  const path = await downloader.enqueue(url, 'jpeg')

  console.log(`Downloading Image to path: ${path}`)

  return path
}