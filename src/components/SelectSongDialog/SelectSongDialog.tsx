import { padStart, range } from 'lodash'
import { FormEvent } from 'react'
import { MAX_SONG_NUMBER } from '../../../shared/constants'
import { DialogContent, DialogTitle } from '../Dialog'
import { useDialogContent } from '../Dialog/Dialog'
import classes from './SelectSongDialog.module.css'

interface Props {
  onSubmit(song: number): void
}

export function SelectSongDialog({ onSubmit }: Props) {
  const { onDismiss } = useDialogContent()

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const $song = e.currentTarget.elements.namedItem('song') as HTMLSelectElement
    const song = parseInt($song.value)

    onSubmit(song)
    onDismiss()
  }

  return (
    <>
      <DialogTitle>Adicionar Cântico</DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit} className={classes.container}>
          <label>
            <span>Cãntico</span>
            <select name="song" required autoFocus>
              {range(1, MAX_SONG_NUMBER).map(song => (
                <option key={song} value={song}>{padStart(song + '', 2, '0')}</option>
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
            >Confirmar</button>
          </div>
        </form>
      </DialogContent>
    </>
  )
}
