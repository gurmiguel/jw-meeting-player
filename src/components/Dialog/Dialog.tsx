/* eslint-disable react-refresh/only-export-components */
import FocusTrap from 'focus-trap-react'
import { ReactNode, createContext, forwardRef, useContext } from 'react'
import './Dialog.base.css'
import classes from './Dialog.module.css'
import { DialogContext, useDialog } from './DialogProvider'

export interface DialogProps {
  id: string
  children: ReactNode | ((ctx: DialogContext, props: Omit<DialogProps, 'children'>) => ReactNode)
  onDismiss(): void
  disableOverlayDismiss?: boolean
}

type DialogContentContext = Omit<DialogProps, 'children'>

const dialogContentContext = createContext({} as DialogContentContext)

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(({ children, onDismiss: handleDismiss, ...props }, ref) => {
  const ctx = useDialog()

  function onDismiss() {
    handleDismiss()
    ctx.hide(props.id)
  }

  return (
    <dialogContentContext.Provider value={{ onDismiss, ...props }}>
      <FocusTrap>
        <div ref={ref} className={classes.dialog}>
          {typeof children === 'function' ? children(ctx, { onDismiss, ...props }) : children}
        </div>
      </FocusTrap>
    </dialogContentContext.Provider>
  )
})

export function useDialogContent() {
  const { hide: _hide, show: _show, ...dialog } = useDialog()
  const dialogContent = useContext(dialogContentContext)

  return {
    ...dialog,
    ...dialogContent,
  }
}
