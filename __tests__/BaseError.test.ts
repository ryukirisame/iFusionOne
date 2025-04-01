import BaseError from '../src/electron/core/errors/BaseError';





describe("BaseError", () => {
  it("should create an error with a message", () => {
    const error = new BaseError("Something went wrong");
    expect(error.message).toBe("Something went wrong");
    expect(error.name).toBe("BaseError");
    expect(error.cause).toBeUndefined();
  });

  it("should create an error with a cause", () => {
    const rootError = new BaseError("Root cause");
    const error = new BaseError("Higher-level error", rootError);

    expect(error.message).toBe("Higher-level error");
    expect(error.name).toBe("BaseError");
    expect(error.cause).toBe(rootError);
  });

  it("should return a concise error message using getMessage", () => {
    const error = new BaseError("Something went wrong");
    expect(error.getMessage()).toBe("BaseError: Something went wrong");
  });

  it("should return the complete chain of error messages using getCauseMessageChain", () => {
    const rootError = new BaseError("Root cause");
    const error = new BaseError("Higher-level error", rootError);

    const messageChain = error.getCauseMessageChain();
    expect(messageChain).toBe(
      "BaseError: Higher-level error\n -> BaseError: Root cause"
    );
  });

  it("should handle deeply nested causes in getCauseMessageChain", () => {
    const rootError = new BaseError("Root cause");
    const middleError = new BaseError("Middle-level error", rootError);
    const topError = new BaseError("Top-level error", middleError);

    const messageChain = topError.getCauseMessageChain();
    expect(messageChain).toBe(
      "BaseError: Top-level error\n -> BaseError: Middle-level error\n -> BaseError: Root cause"
    );
  });

  it("should handle circular references in getCauseMessageChain gracefully", () => {
    const rootError = new BaseError("Root cause");
    const higherError = new BaseError("Higher-level error", rootError);

    // Introduce a circular reference
    (rootError as any).cause = higherError;

    const messageChain = higherError.getCauseMessageChain();
    expect(messageChain).toContain("Circular reference detected in error cause chain.");
  });

  it("should return the stack trace using getStackTrace", () => {
    const error = new BaseError("Something went wrong");
    const stackTrace = error.getStackTrace();

    expect(stackTrace).toContain("Stack Trace:");
    expect(stackTrace).toContain("BaseError: Something went wrong");
  });

  it("should return an array of error messages using getCauseChainArray", () => {
    const rootError = new BaseError("Root cause");
    const error = new BaseError("Higher-level error", rootError);

    const messageArray = error.getCauseChainArray();
    expect(messageArray).toEqual([
      "BaseError: Higher-level error",
      "BaseError: Root cause",
    ]);
  });

  it("should handle circular references in getCauseChainArray gracefully", () => {
    const rootError = new BaseError("Root cause");
    const higherError = new BaseError("Higher-level error", rootError);

    // Introduce a circular reference
    (rootError as any).cause = higherError;

    const messageArray = higherError.getCauseChainArray();
    expect(messageArray).toContain("Circular reference detected in error cause chain.");
  });

  

 

  it("should handle empty error messages", () => {
    const error = new BaseError("");
    expect(error.message).toBe("");
    expect(error.getMessage()).toBe("BaseError: ");
  });

  it("should work with subclasses of BaseError", () => {
    class DatabaseError extends BaseError {
      constructor(message: string, cause?: Error) {
        super(message, cause);
      }
    }

    const rootError = new BaseError("Root cause");
    const dbError = new DatabaseError("Database error occurred", rootError);

    expect(dbError.message).toBe("Database error occurred");
    expect(dbError.name).toBe("DatabaseError");
    expect(dbError.cause).toBe(rootError);

    const messageChain = dbError.getCauseMessageChain();
    expect(messageChain).toBe(
      "DatabaseError: Database error occurred\n -> BaseError: Root cause"
    );
  });

  it("should handle errors without a cause", () => {
    const error = new BaseError("Standalone error");
    const messageChain = error.getCauseMessageChain();
    const messageArray = error.getCauseChainArray();

    expect(messageChain).toBe("BaseError: Standalone error");
    expect(messageArray).toEqual(["BaseError: Standalone error"]);
  });
});

