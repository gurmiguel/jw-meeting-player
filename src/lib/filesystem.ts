/* eslint-disable @typescript-eslint/no-non-null-assertion */
export async function getSortedTransferFiles(items: DataTransferItem[]) {
  const itemsEntries = items.map(it => [it.webkitGetAsEntry()!, it.getAsFile()!] as const)
  const directory = await new Promise<FileSystemDirectoryEntry | undefined>(res => items[0].webkitGetAsEntry()?.getParent((e) => res(e as FileSystemDirectoryEntry)))

  const r = directory?.createReader()

  const result = new Array<File>()
  
  await new Promise<void>(resolve => {
    r?.readEntries(entries => {
      for (const e of entries) {
        const [,item] = itemsEntries.find(([it]) => it.fullPath === e.fullPath) ?? []
        if (item)
          result.push(item)
      }
      resolve()
    })
  })

  if (result.length !== items.length)
    return itemsEntries.map(([,item]) => item)
  else
    return result
}
