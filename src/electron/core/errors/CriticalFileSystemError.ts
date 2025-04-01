import FileSystemError from "./FileSystemError.js";

export default class CriticalFileSystemError extends FileSystemError {
    constructor(message: string, cause?: Error) {
        super(message, cause);
      }
}