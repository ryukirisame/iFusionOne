import { BaseError } from "./index.js";

/**
 * @class DataParsingError
 * @description Represents an error that occurs during data parsing (e.g., JSON parsing).
 */
export default class DataParsingError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}
