import DatabaseError from "./DatabaseError.js";


export default class CriticalDatabaseError extends DatabaseError {
    constructor(message: string, cause?: Error) {
      super(message, cause);
      this.name = "CriticalDatabaseError";
    }
  }
  