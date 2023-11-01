import clsx from 'clsx'
import { DialogContent, DialogTitle } from '../Dialog'
import { useDialogContent } from '../Dialog/Dialog'
import classes from './UploadMetadataDialog.module.css'

interface Props {
  defaultGroup?: string
  defaultLabel?: string
  onSubmit(data: { group: string, label: string }): void
}

export function UploadMetadataDialog({ onSubmit, defaultGroup, defaultLabel }: Props) {
  const { onDismiss } = useDialogContent()

  return (
    <>
      <DialogTitle>Incluir Mídia</DialogTitle>
      <DialogContent>
        <form
          onSubmit={e => {
            const group = (e.currentTarget.elements.namedItem('group') as HTMLInputElement).value
            const label = (e.currentTarget.elements.namedItem('label') as HTMLInputElement).value

            onSubmit({ group, label })
            onDismiss()
          }}
          className={classes.container}
        >
          <label className={classes.inputWrapper}>
            <span className={classes.label}>Grupo</span>
            <input type="text" name="group" defaultValue={defaultGroup} className={classes.input} />
          </label>
          <label className={classes.inputWrapper}>
            <span className={classes.label}>Descrição</span>
            <input type="text" name="label" defaultValue={defaultLabel} className={classes.input} />
          </label>

          <div className={classes.buttons}>
            <button
              type="button"
              onClick={onDismiss}
              className={classes.button}
            >Cancelar</button>
            <button
              type="submit"
              className={clsx(classes.button, classes.buttonSubmit)}
            >Confirmar</button>
          </div>
        </form>
      </DialogContent>
    </>
  )
}
