/* eslint-disable @typescript-eslint/no-non-null-assertion */
export async function getSortedTransferFiles(files: File[]) {
  files.forEach(file => {
    file.path = common.getPathForFile(file) || file.path
  })

  if (files.some(it => !it.path)) return files

  const filesOrder = await common.getFilesSorted(files.map(it => it.path))

  return files.toSorted((a,b) => {
    const aIndex = filesOrder.indexOf(a.path)
    const bIndex = filesOrder.indexOf(b.path)
    return aIndex - bIndex
  })
}

export async function getWebdataBase64Files(files: File[]) {
  for (const file of files) {
    if (file.path) continue

    file.path = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.addEventListener('load', e => {
        const url = e.target?.result as string
        if (!url) return reject('Invalid file')
        return resolve(url)
      })
      r.addEventListener('error', reject)
      r.readAsDataURL(file)
    })
  }

  return files
}
