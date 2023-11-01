import { PropsWithChildren } from 'react'
import classes from './Dialog.module.css'

export function DialogContent({ children }: PropsWithChildren) {

  return (
    <div className={classes.content}>
      {children}
    </div>
  )
}
