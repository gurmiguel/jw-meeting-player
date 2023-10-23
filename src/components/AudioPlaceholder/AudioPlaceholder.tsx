import { useMemo } from 'react'

interface Props {
  file: string
}

export function AudioPlaceholder({ file }: Props) {
  const filename = useMemo(() => {
    return file.split('/').pop() ?? file
  }, [file])

  return (
    <div className="w-[260px] h-[180px] object-cover bg-zinc-950 flex items-center justify-center text-center">
      <span className="text-zinc-50 font-thin underline underline-offset-4">{filename}</span>
    </div>
  )
}
