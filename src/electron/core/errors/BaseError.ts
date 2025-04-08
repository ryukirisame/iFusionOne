/**
 * @class BaseError
 * @description A custom error class that extends the built-in Error class to support error chaining and enhanced debugging.
 */
export default class BaseError extends Error {
  /**
   * The underlying cause of this error, if any.
   */
  public cause?: Error;

  /**
   * Constructs a new BaseError instance.
   * @param {string} message - The error message.
   * @param {Error} [cause] - The underlying cause of this error (optional).
   */
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name; // Set the error name to the class name
    this.cause = cause;

    // Ensure the stack trace includes the original error
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Returns the message for this error.
   * @returns {string} A string containing the error name and message.
   * @example
   * const error = new BaseError("Something went wrong");
   * console.log(error.getMessage()); // "BaseError: Something went wrong"
   */
  getMessage(): string {
    return `${this.name}: ${this.message}`;
  }

  /**
   * Returns the complete chain of error messages, including all causes, as a single string.
   * Handles circular references gracefully.
   * @returns {string} A string representing the chain of error messages.
   * @example
   * const rootError = new BaseError("Root cause");
   * const error = new BaseError("Higher-level error", rootError);
   * console.log(error.getCauseMessageChain());
   * // "BaseError: Higher-level error\n -> BaseError: Root cause"
   */
  getCauseMessageChain(): string {
    let result = this.getMessage();
    const visited = new Set<Error>();
    let currentCause: Error | undefined = this.cause;

    while (currentCause && !visited.has(currentCause)) {
      visited.add(currentCause);
      result += `\n -> ${currentCause.name}: ${currentCause.message}`;
      currentCause = currentCause instanceof BaseError ? currentCause.cause : undefined;
    }

    if (currentCause) {
      result += "\n -> Circular reference detected in error cause chain.";
    }

    return result;
  }

  /**
   * Returns the stack trace for this error.
   * @returns {string} A string containing the stack trace.
   * @example
   * const error = new BaseError("Something went wrong");
   * console.log(error.getStackTrace());
   * // "Stack Trace:\n<stack trace>"
   */
  getStackTrace(): string {
    return `Stack Trace:\n${this.stack}`;
  }

  /**
   * Returns an array of strings where each element represents a single error message in the cause chain.
   * Handles circular references gracefully.
   * @returns {string[]} An array of error messages in the cause chain.
   * @example
   * const rootError = new BaseError("Root cause");
   * const error = new BaseError("Higher-level error", rootError);
   * console.log(error.getCauseChainArray());
   * // ["BaseError: Higher-level error", "BaseError: Root cause"]
   */
  getCauseMessageChainArray(): string[] {
    const messages: string[] = [];
    const visited = new Set<Error>();
    let current: Error | undefined = this;

    while (current && !visited.has(current)) {
      visited.add(current);
      messages.push(`${current.name}: ${current.message}`);
      current = current instanceof BaseError ? current.cause : undefined;
    }

    if (current) {
      messages.push("Circular reference detected in error cause chain.");
    }

    return messages;
  }

  // getCauseChainErrorArray(): Error[] {
  //   const errors: Error[] = [];
  //   const visited = new Set<Error>();
  //   let current: Error | undefined = this;

  //   while (current && !visited.has(current)) {
  //     visited.add(current);
  //     errors.push(current);
  //     current = current instanceof BaseError ? current.cause : undefined;
  //   }

  //   if (current) {
  //     errors.push(new BaseError("Circular reference detected in error cause chain."));
  //   }

  //   return errors;
  // }
}


