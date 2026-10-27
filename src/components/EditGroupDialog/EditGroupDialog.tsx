import { FormEvent } from 'react'
import { DialogContent, DialogTitle } from '../Dialog'
import { useDialogContent } from '../Dialog/Dialog'
import classes from './EditGroupDialog.module.css'

interface Props {
  defaultLabel?: string
  onSubmit(label: string): void
}

export function EditGroupDialog({ defaultLabel = '', onSubmit }: Props) {
  const { onDismiss } = useDialogContent()

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const label = (e.currentTarget.elements.namedItem('label') as HTMLInputElement).value

    onSubmit(label)
    onDismiss?.()
  }

  return (
    <>
      <DialogTitle>Editar Grupo</DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit} className={classes.container}>
          <label>
            <span>Nome do Grupo</span>
            <input type="text" name="label" defaultValue={defaultLabel} required autoFocus />
          </label>

          <div className="dialog-buttons">
            <button
              type="button"
              onClick={onDismiss}
              className="dialog-button"
            >Cancelar</button>
            <button
              type="submit"
              className="dialog-button dialog-button--submit"
            >Salvar</button>
          </div>
        </form>
      </DialogContent>
    </>
  )
}
