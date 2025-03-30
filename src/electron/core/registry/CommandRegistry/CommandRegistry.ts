/**
 * Type definition for a command handler function.
 * A command handler takes any number of arguments and returns a value or a Promise.
 */
type CommandHandler = (...args: any[]) => any | Promise<any>;

/**
 * The context object passed to middlewares and commands.
 */
interface CommandContext {
  readonly command: string;
  args: unknown[];
  result?: unknown;
  error?: unknown;
}

/**
 * Type definition for middleware functions.
 * Middleware receives a context and a `next` function to control execution flow.
 */
type Middleware = (context: CommandContext, next: () => Promise<void>) => void | Promise<void>;

/**
 * CommandRegistry is a static registry class that manages command handlers.
 * It allows registering commands and executing them with arguments.
 * It also supports pre and post middlewares for processing command data.
 * 
 * @example
 * 
 * // Register a simple command that returns a greeting message
CommandRegistry.register("say:hello", async (name: string) => {
  return `Hello, ${name}!`;
});

CommandRegistry.usePre(async (context, next) => {
  console.log(`[PRE] Executing command: ${context.command}`);
  await next();
});

CommandRegistry.usePost(async (context, next) => {
  await next();
  console.log(`Command "${context.command}" executed with result:`, context.result);
});

// Execute the registered command
const result = await CommandRegistry.execute("say:hello", "Alice");
console.log("Result:", result);
 * 
 * 
 */
export class CommandRegistry {
  /**
   * Map to store registered commands with their respective handlers.
   * The key is the command name, and the value is the command handler function.
   */
  private static commands = new Map<string, CommandHandler>();

  /**
   * List of pre-middleware functions that run before command handlers.
   */
  private static preMiddleware: Middleware[] = [];

  /**
   * List of post-middleware functions that run after command handlers.
   */
  private static postMiddleware: Middleware[] = [];

  /**
   * Registers a pre-middleware function.
   * @param middleware - A function to process command data before handlers execute.
   */
  static usePre(middleware: Middleware) {
    this.preMiddleware.push(middleware);
  }

  /**
   * Registers a post-middleware function.
   * @param middleware - A function to process command data after handlers execute.
   */
  static usePost(middleware: Middleware) {
    this.postMiddleware.push(middleware);
  }

  /**
   * Register a new command and its command handler.
   * @param command - The unique name of the command
   * @param handler - The function to execute when the command is called.
   * @throws Error if the command is already registered.
   * @throws Error if the command name is invalid.
   */
  static register(command: string, handler: CommandHandler) {
    try {
      this.validateCommandName(command);
    } catch (error) {
      throw new Error("Invalid command name: " + error);
    }

    if (this.commands.has(command)) {
      throw new Error(`Command ${command} is already registered.`);
    }
    this.commands.set(command, handler);
  }

  /**
   * Removes a registered command.
   * @param name - The name of the command.
   * @returns True if the command was removed, false if it was not found.
   * @throws Error if the command name is invalid.
   */
  static unregister(command: string): boolean {
    try {
      this.validateCommandName(command);
    } catch (error) {
      throw new Error("Invalid command name: " + error);
    }
    return this.commands.delete(command);
  }

  /**
   * Executes a registered command with arguments.
   * The command handler is called with the provided arguments.
   * @param command - The command to execute.
   * @param args - Arguments to pass to the command handler.
   * @returns  The result of the command handler.
   * @throws Error if the command is not registered.
   * @throws Error if a middleware throws an error.
   * @throws Error if the command execution failed.
   * @throws Error if the command name is invalid.
   * @throws Error if the command name was modified by middleware.
   */
  static async execute(command: string, ...args: unknown[]): Promise<unknown> {
    try{
      this.validateCommandName(command);
    } catch(error){
      throw new Error("Invalid command name: " + error);
    }

    // Fetch the command handler from the registry
    const commandHandler = this.commands.get(command);

    // Throw an error if the command is not registered
    if (!commandHandler) throw new Error(`No handler registered for command: ${command}`);

    // Create execution context
    const context: CommandContext = { command, args };

    // Flag to check if the command is executed
    let commandExecuted = false;

    try {
      // Execute all pre-middlewares sequentially
      await this.runMiddleware(this.preMiddleware, context);

      // Validate the command name again after middleware execution
      if (context.command !== command) {
        throw new Error("Middleware cannot modify the command name.");
      }

      // Execute the actual command and store the result in context
      context.result = await commandHandler(...args);
      commandExecuted = true;
    } catch (error) {
      context.error = error;
      console.error(`[ERROR] Command "${command}" failed:`, error);
      throw error;
    }

    if (commandExecuted) {
      // Now that the command has executed, run post-middlewares
      try {
        await this.runMiddleware(this.postMiddleware, context);
      } catch (error) {
        console.error(
          `[POST ERROR] Command "${command}" encountered an error in post-middleware:`,
          error
        );
      }
    }

    return context.result;
  }

  /**
   * Runs a list of middlewares sequentially.
   * Each middleware calls `next()` to proceed to the next one.
   * @param middlewares - The list of middleware functions to execute.
   * @param context - The execution context.
   * @throws Error if a middleware throws an error or if `next()` is not called.
   */
  private static async runMiddleware(middlewares: Middleware[], context: CommandContext) {
    // Index to keep track of the current middleware
    let index = 0;

    // Recursive function to run middleware chain
    const next = async () => {
      if (index < middlewares.length) {
        // Get the current middleware
        const currentMiddleware = middlewares[index++];

        let nextCalled = false; // Flag to check if `next()` is called

        try {
          // Call the middleware with context and next function
          await currentMiddleware(context, async () => {
            nextCalled = true;
            await next();
          });

          // If `next()` is not called, stop the middleware chain
          if (!nextCalled) {
            throw new Error("Middleware chain interrupted: next() was not called.");
          }
        } catch (error) {
          context.error = error;
          throw error;
        }
      }
    };

    await next(); // Start the middleware chain
  }

  /**
   * Check if a command is registered.
   * @param command - The name of the command to check
   * @returns True if the command is registered, false otherwise.
   * @throws Error if the command name is invalid.
   */
  static hasCommand(command: string): boolean {
    try{
      this.validateCommandName(command);
    } catch(error){
      throw new Error("Invalid command name: " + error);
    }

    return this.commands.has(command);
  }

  /**
   * Lists all registered commands.
   * @returns An array of registered command names.
   */
  static listCommands(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Validates a command name to ensure it meets the required criteria.
   *
   * @param command - The name of the command to validate.
   * @throws Error if the command name is invalid.
   */
  private static validateCommandName(command: string) {
    if (command == null || command == undefined) {
      throw new Error("Command name cannot be null or undefined.");
    }

    if (typeof command !== "string") {
      throw new Error("Command name must be a string.");
    }

    // Trim the command name
    const trimmedCommand = command.trim();

    if (trimmedCommand === "") {
      throw new Error("Command name cannot be empty.");
    }

    if (!command) {
      throw new Error("Command name cannot be empty.");
    }
    if (typeof command !== "string") {
      throw new Error("Command name must be a string.");
    }

    if (command.includes(" ")) {
      throw new Error("Command name cannot contain spaces.");
    }

    // Check for numeric command names
    if (!isNaN(Number(command))) {
      throw new Error("Command name cannot be a number.");
    }

    // Maximum length of command name
    if (command.length > 255) {
      throw new Error("Command name cannot exceed 255 characters.");
    }

    // Minimum length of command name
    if (command.length < 1) {
      throw new Error("Command name is too short.");
    }

    // Check for invalid characters
    const allowedCharacters = "a-zA-Z0-9:_-"; // Define allowed characters for command names

    // Regex to check for invalid characters
    const invalidCharacters = new RegExp(`[^${allowedCharacters}]`);

    // Check for invalid characters in the command name
    const matches = trimmedCommand.match(invalidCharacters);
    if (matches) {
      throw new Error(
        `Command name "${command}" contains invalid characters: ${matches.join(
          ", "
        )}. Only alphanumeric characters, hyphens, colons, and underscores are allowed.`
      );
    }

    // Check for reserved keywords
    const reservedKeywords = [
      "constructor", // JavaScript object constructor
      "__proto__", // Prototype pollution vulnerability
      "prototype", // Prototype property
      "toString", // Object's toString method
      "valueOf", // Object's valueOf method
      "hasOwnProperty", // Object's hasOwnProperty method
      "isPrototypeOf", // Object's isPrototypeOf method
      "propertyIsEnumerable", // Object's propertyIsEnumerable method
      "apply", // Function's apply method
      "call", // Function's call method
      "bind", // Function's bind method
      "length", // Function's length property
      "name", // Function's name property
      "arguments", // Function's arguments object
      "eval", // JavaScript eval function
      "undefined", // Undefined keyword
      "null", // Null keyword
      "NaN", // Not-a-Number value
      "Infinity", // Infinity value
      "globalThis", // Global object in modern JavaScript
      "window", // Global object in browsers
      "document", // DOM document object
      "alert", // Browser alert function
      "console", // Console object
      "process", // Node.js process object
      "require", // Node.js require function
      "module", // Node.js module object
      "exports", // Node.js exports object
    ];

    if (reservedKeywords.includes(trimmedCommand)) {
      throw new Error(`Command name "${command}" cannot be a reserved keyword.`);
    }
  }
}

// Usage example

// // Register a simple command that returns a greeting message
// CommandRegistry.register("say:hello", async (name: string) => {
//   return `Hello, ${name}!`;
// });

// // Pre-Hooks
// CommandRegistry.usePre(async (context, next) => {
//   console.log(`[PRE1] Transforming command: ${context.command}`);

//   if (context.command === "say:hello") {
//     context.args[0] = context.args[0] + " x Bob";
//   }

//   await next();
// });

// CommandRegistry.usePre(async (context, next) => {
//   console.log(`[PRE2] Executing command: ${context.command}`);
//   await next();
// });

// // Post-Hooks
// CommandRegistry.usePost(async (context, next) => {
//   await next();
//   console.log(`Command "${context.command}" executed with result:`, context.result);
// });

// async function run() {
//   // Execute the registered command
//   await CommandRegistry.execute("say:hello", "Alice");
// }

// run();
