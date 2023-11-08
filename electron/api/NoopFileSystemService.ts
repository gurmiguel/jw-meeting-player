import { FileSystemService } from './FileSystemService'

export class NoopFileSystemService extends FileSystemService {
  async flush() {
    return 0
  }
}
