import BaseError from "./BaseError.js";

/**
 * @class SchemaValidationError
 * @description Represents an error that occurs during schema validation.
 */
export default class SchemaValidationError extends BaseError {

  /**
   * An array of validation issues.
   */
  public validationIssues: string[];

  /**
   * Constructs a new SchemaValidationError instance.
   * @param {string} message - The error message.
   * @param {string[]} validationIssues - An array of validation issues.
   * @param {Error} [cause] - The underlying cause of this error (optional).
   */
  constructor(message: string, validationIssues: string[], cause?: Error) {
    super(message, cause);
    this.validationIssues = validationIssues;
  }

  /**
   * Returns all validation issues as a single string.
   * @returns {string} A string containing the validation issues.
   */
  getSchemaValidationIssues(): string {
    return this.validationIssues.join("\n");
  }
}
