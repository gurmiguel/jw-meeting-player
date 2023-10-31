import { titleBar } from '../../../constants'

interface Props {
  title: string
}

export function TitleBar({ title }: Props) {

  return (
    <div className="sticky top-0 app-draggable-on w-full text-white p-2 pl-4 z-50" style={{ height: titleBar.height, backgroundColor: titleBar.color  }}>
      {title}
    </div>
  )
}
