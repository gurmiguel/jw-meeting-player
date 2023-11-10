import { titleBar } from '../../../shared/constants'

interface Props {
  title: string
}

export function TitleBar({ title }: Props) {

  return (
    <>
      <div className="fixed top-0 app-draggable-on w-full text-white p-2 pl-4 z-50" style={{ height: titleBar.height, backgroundColor: titleBar.color  }}>
        {title}
      </div>
      <div className="sticky top-0 w-full" style={{ height: titleBar.height }} />
    </>
  )
}
