import { FormEvent } from 'react'
import type { JWPubTalk } from '../../../electron/utils/jwpub'
import { DialogContent, DialogTitle } from '../Dialog'
import { useDialogContent } from '../Dialog/Dialog'
import classes from './SelectTalkDialog.module.css'

interface Props {
  talks: JWPubTalk[]
  onSubmit(talk: JWPubTalk): void
}

export function SelectTalkDialog({ talks, onSubmit }: Props) {
  const { onDismiss } = useDialogContent()

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const documentId = Number((e.currentTarget.elements.namedItem('talk') as HTMLSelectElement).value)
    const talk = talks.find(talk => talk.documentId === documentId)
    if (!talk) return

    onSubmit(talk)
    onDismiss?.()
  }

  return (
    <>
      <DialogTitle>Selecionar Discurso</DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit} className={classes.container}>
          <label>
            <span>Discurso</span>
            <select name="talk" required autoFocus>
              {talks.map(talk => (
                <option key={talk.documentId} value={talk.documentId}>{talk.title}</option>
              ))}
            </select>
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
            >Importar</button>
          </div>
        </form>
      </DialogContent>
    </>
  )
}
