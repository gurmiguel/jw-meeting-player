import { FormEvent, PropsWithChildren } from 'react'
import { DialogContent } from '../Dialog'
import { useDialogContent } from '../Dialog/Dialog'
import classes from './ConfirmDialog.module.css'

interface Props {
  cancelLabel?: string | false
  confirmLabel?: string | false
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

          <form className="dialog-buttons" onSubmit={handleSubmit}>
            {cancelLabel !== false && (
              <button
                type="button"
                onClick={onDismiss}
                className="dialog-button"
              >{cancelLabel}</button>
            )}
            {confirmLabel !== false && (
              <button
                type="submit"
                className="dialog-button dialog-button--submit"
                autoFocus
              >{confirmLabel}</button>
            )}
          </form>
        </div>
      </DialogContent>
    </>
  )
}
