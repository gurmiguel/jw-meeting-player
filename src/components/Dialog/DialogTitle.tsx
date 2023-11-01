import { PropsWithChildren } from 'react'
import classes from './Dialog.module.css'

export function DialogTitle({ children }: PropsWithChildren) {

  return (
    <h2 className={classes.title}>
      {children}
    </h2>
  )
}
