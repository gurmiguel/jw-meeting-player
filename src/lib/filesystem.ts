/* eslint-disable @typescript-eslint/no-non-null-assertion */
export async function getSortedTransferFiles(files: File[]) {
  files.forEach(file => {
    file.path = common.getPathForFile(file)
  })

  const filesOrder = await common.getFilesSorted(files.map(it => it.path))

  return files.toSorted((a,b) => {
    const aIndex = filesOrder.indexOf(a.path)
    const bIndex = filesOrder.indexOf(b.path)
    return aIndex - bIndex
  })
}
