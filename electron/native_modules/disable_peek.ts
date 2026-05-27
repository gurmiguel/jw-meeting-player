import { getNativeModulePath } from './util'

const { disablePeek } = require(getNativeModulePath('disable_peek'))

type DisablePeek = (win: Buffer) => void

export default disablePeek as DisablePeek
