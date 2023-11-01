import clsx from 'clsx'
import { FormEvent, PropsWithChildren } from 'react'
import { DialogContent } from '../Dialog'
import { useDialogContent } from '../Dialog/Dialog'
import classes from './ConfirmDialog.module.css'

interface Props {
  cancelLabel?: string
  confirmLabel?: string
  onConfirm(): void
}

export function ConfirmDialog({ onConfirm, cancelLabel = 'Não', confirmLabel = 'Sim', children }: PropsWithChildren<Props>) {
  const { onDismiss } = useDialogContent()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onConfirm()
    onDismiss()
  }

  return (
    <>
      <DialogContent>
        <div className={classes.container}>
          <div className={classes.question}>{children}</div>

          <form className={classes.buttons} onSubmit={handleSubmit}>
            <button
              type="button"
              onClick={onDismiss}
              className={classes.button}
            >{cancelLabel}</button>
            <button
              type="submit"
              className={clsx(classes.button, classes.buttonSubmit)}
              autoFocus
            >{confirmLabel}</button>
          </form>
        </div>
      </DialogContent>
    </>
  )
}
