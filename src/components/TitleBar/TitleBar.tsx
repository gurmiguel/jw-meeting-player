import { titleBar } from '../../../constants'

interface Props {
  title: string
}

export function TitleBar({ title }: Props) {

  return (
    <div className="app-draggable-on w-full text-white p-2 pl-4" style={{ height: titleBar.height, backgroundColor: titleBar.color  }}>
      {title}
    </div>
  )
}
