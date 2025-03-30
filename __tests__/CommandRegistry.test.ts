import { CommandRegistry } from "../src/electron/core/registry/CommandRegistry/CommandRegistry";

describe("CommandRegistry", () => {
  beforeEach(() => {
    // Clear all registered commands and middlewares before each test
    (CommandRegistry as any).commands.clear();
    (CommandRegistry as any).preMiddleware.length = 0;
    (CommandRegistry as any).postMiddleware.length = 0;
  });

  test("should register and execute a command", async () => {
    CommandRegistry.register("greet", (name: string) => `Hello, ${name}!`);
    const result = await CommandRegistry.execute("greet", "Alice");
    expect(result).toBe("Hello, Alice!");
  });

  test("should throw an error when registering a duplicate command", () => {
    CommandRegistry.register("greet", () => "Hello");
    expect(() => CommandRegistry.register("greet", () => "Hi")).toThrowError(
      "Command greet is already registered."
    );
  });

  test("should unregister a command", () => {
    CommandRegistry.register("greet", () => "Hello");
    const result = CommandRegistry.unregister("greet");
    expect(result).toBe(true);
    expect(CommandRegistry.hasCommand("greet")).toBe(false);
  });

  test("should return false when unregistering a non-existent command", () => {
    const result = CommandRegistry.unregister("nonexistent");
    expect(result).toBe(false);
  });

  test("should execute async command", async () => {
    CommandRegistry.register("fetchData", async (url: string) => `Data from ${url}`);
    const result = await CommandRegistry.execute("fetchData", "https://example.com");
    expect(result).toBe("Data from https://example.com");
  });

  test("should run pre and post middlewares", async () => {
    const preSpy = jest.fn();
    const postSpy = jest.fn();

    CommandRegistry.usePre(async (context, next) => {
      preSpy(context.command);
      await next();
    });

    CommandRegistry.usePost(async (context, next) => {
      await next();
      postSpy(context.result);
    });

    CommandRegistry.register("sum", (a: number, b: number) => a + b);
    const result = await CommandRegistry.execute("sum", 2, 3);

    expect(preSpy).toHaveBeenCalledWith("sum");
    expect(postSpy).toHaveBeenCalledWith(5);
    expect(result).toBe(5);
  });

  test("should handle middleware errors gracefully", async () => {
    CommandRegistry.usePre(async (context, next) => {
      throw new Error("Middleware error");
    });

    CommandRegistry.register("sample", () => "test");

    await expect(CommandRegistry.execute("sample")).rejects.toThrow("Middleware error");
  });

  test("should handle command errors gracefully", async () => {
    CommandRegistry.register("fail", () => {
      throw new Error("Command failed");
    });

    await expect(CommandRegistry.execute("fail")).rejects.toThrow("Command failed");
  });

  test("should list registered commands", () => {
    CommandRegistry.register("greet", () => "Hello");
    CommandRegistry.register("farewell", () => "Goodbye");
    const commands = CommandRegistry.listCommands();
    expect(commands).toContain("greet");
    expect(commands).toContain("farewell");
  });

  test("should check if a command is registered", () => {
    CommandRegistry.register("testCommand", () => "test");
    expect(CommandRegistry.hasCommand("testCommand")).toBe(true);
    expect(CommandRegistry.hasCommand("nonexistent")).toBe(false);
  });
});

describe("CommandRegistry", () => {
  beforeEach(() => {
    // Clear all registered commands and middleware before each test
    CommandRegistry["commands"].clear();
    CommandRegistry["preMiddleware"] = [];
    CommandRegistry["postMiddleware"] = [];
  });

  test("should register and execute a command successfully", async () => {
    CommandRegistry.register("greet", async (name: string) => `Hello, ${name}!`);
    const result = await CommandRegistry.execute("greet", "Alice");
    expect(result).toBe("Hello, Alice!");
  });

  test("should throw an error when registering a duplicate command", () => {
    CommandRegistry.register("duplicate", async () => "test");
    expect(() => CommandRegistry.register("duplicate", async () => "test")).toThrow(
      "Command duplicate is already registered."
    );
  });

  test("should throw an error when executing an unregistered command", async () => {
    await expect(CommandRegistry.execute("unknownCommand")).rejects.toThrow(
      "No handler registered for command: unknownCommand"
    );
  });

  test("should unregister a command successfully", () => {
    CommandRegistry.register("toBeRemoved", async () => "test");
    const removed = CommandRegistry.unregister("toBeRemoved");
    expect(removed).toBe(true);
    expect(CommandRegistry.hasCommand("toBeRemoved")).toBe(false);
  });

  test("should return false when unregistering a non-existent command", () => {
    const removed = CommandRegistry.unregister("nonExistent");
    expect(removed).toBe(false);
  });

  test("should list all registered commands", () => {
    CommandRegistry.register("cmd1", async () => "test1");
    CommandRegistry.register("cmd2", async () => "test2");
    const commands = CommandRegistry.listCommands();
    expect(commands).toEqual(["cmd1", "cmd2"]);
  });

  test("should execute pre-middleware before the command handler", async () => {
    const preMiddlewareSpy = jest.fn(async (context, next) => {
      context.args[0] = "Modified";
      await next();
    });
    CommandRegistry.usePre(preMiddlewareSpy);

    CommandRegistry.register("testCommand", async (arg: string) => `Result: ${arg}`);
    const result = await CommandRegistry.execute("testCommand", "Original");

    expect(preMiddlewareSpy).toHaveBeenCalled();
    expect(result).toBe("Result: Modified");
  });

  test("should execute post-middleware after the command handler", async () => {
    const postMiddlewareSpy = jest.fn(async (context, next) => {
      await next();
      context.result = `Post-Processed: ${context.result}`;
    });
    CommandRegistry.usePost(postMiddlewareSpy);

    CommandRegistry.register("testCommand", async (arg: string) => `Result: ${arg}`);
    const result = await CommandRegistry.execute("testCommand", "Input");

    expect(postMiddlewareSpy).toHaveBeenCalled();
    expect(result).toBe("Post-Processed: Result: Input");
  });

  test("should handle errors in pre-middleware", async () => {
    CommandRegistry.usePre(async () => {
      throw new Error("Pre-middleware error");
    });

    CommandRegistry.register("testCommand", async () => "Result");

    await expect(CommandRegistry.execute("testCommand")).rejects.toThrow("Pre-middleware error");
  });

  test("should handle errors in post-middleware", async () => {
    CommandRegistry.usePost(async () => {
      throw new Error("Post-middleware error");
    });

    CommandRegistry.register("testCommand", async () => "Result");

    await expect(CommandRegistry.execute("testCommand")).resolves.toBe("Result");
    // Post-middleware errors are logged but do not affect the command result
  });

  test("should handle errors in the command handler", async () => {
    CommandRegistry.register("errorCommand", async () => {
      throw new Error("Command handler error");
    });

    await expect(CommandRegistry.execute("errorCommand")).rejects.toThrow("Command handler error");
  });

  test("should execute multiple pre-middlewares in sequence", async () => {
    const preMiddleware1 = jest.fn(async (context, next) => {
      context.args[0] = `${context.args[0]}-Pre1`;
      await next();
    });
    const preMiddleware2 = jest.fn(async (context, next) => {
      context.args[0] = `${context.args[0]}-Pre2`;
      await next();
    });

    CommandRegistry.usePre(preMiddleware1);
    CommandRegistry.usePre(preMiddleware2);

    CommandRegistry.register("testCommand", async (arg: string) => `Result: ${arg}`);
    const result = await CommandRegistry.execute("testCommand", "Input");

    expect(preMiddleware1).toHaveBeenCalled();
    expect(preMiddleware2).toHaveBeenCalled();
    expect(result).toBe("Result: Input-Pre1-Pre2");
  });

  test("should execute multiple post-middlewares in sequence", async () => {
    const postMiddleware1 = jest.fn(async (context, next) => {
      context.result = `${context.result}-Post1`;
      await next();
    });
    const postMiddleware2 = jest.fn(async (context, next) => {
      context.result = `${context.result}-Post2`;
      await next();
    });

    CommandRegistry.usePost(postMiddleware1);
    CommandRegistry.usePost(postMiddleware2);

    CommandRegistry.register("testCommand", async (arg: string) => `Result: ${arg}`);
    const result = await CommandRegistry.execute("testCommand", "Input");

    expect(postMiddleware1).toHaveBeenCalled();
    expect(postMiddleware2).toHaveBeenCalled();
    expect(result).toBe("Result: Input-Post1-Post2");
  });

  test("should interrupt middleware chain if next() is not called", async () => {
    CommandRegistry.usePre(async () => {
      // Intentionally not calling next()
    });

    CommandRegistry.register("testCommand", async () => "Result");

    await expect(CommandRegistry.execute("testCommand")).rejects.toThrow(
      "Middleware chain interrupted: next() was not called."
    );
  });

  test("should check if a command is registered", () => {
    CommandRegistry.register("exists", async () => "test");
    expect(CommandRegistry.hasCommand("exists")).toBe(true);
    expect(CommandRegistry.hasCommand("nonExistent")).toBe(false);
  });
});

describe("CommandRegistry - Additional Rigorous Tests", () => {
  beforeEach(() => {
    // Clear all registered commands and middleware before each test
    (CommandRegistry as any).commands.clear();
    (CommandRegistry as any).preMiddleware.length = 0;
    (CommandRegistry as any).postMiddleware.length = 0;
  });

  test("should handle concurrent execution of the same command", async () => {
    CommandRegistry.register("concurrent", async (delay: number) => {
      return new Promise((resolve) => setTimeout(() => resolve(`Done in ${delay}ms`), delay));
    });

    const results = await Promise.all([
      CommandRegistry.execute("concurrent", 100),
      CommandRegistry.execute("concurrent", 200),
      CommandRegistry.execute("concurrent", 300),
    ]);

    expect(results).toEqual(["Done in 100ms", "Done in 200ms", "Done in 300ms"]);
  });

  test("should execute middlewares sequentially for a single command execution", async () => {
    const executionOrder: string[] = [];

    CommandRegistry.usePre(async (context, next) => {
      executionOrder.push("middleware1");
      await next();
    });

    CommandRegistry.usePre(async (context, next) => {
      executionOrder.push("middleware2");
      await next();
    });

    CommandRegistry.register("testCommand", async () => {
      executionOrder.push("handler");
    });

    await CommandRegistry.execute("testCommand");

    expect(executionOrder).toEqual(["middleware1", "middleware2", "handler"]);
  });

  test("should handle commands with no arguments", async () => {
    CommandRegistry.register("noArgsCommand", async () => "No arguments needed");

    const result = await CommandRegistry.execute("noArgsCommand");

    expect(result).toBe("No arguments needed");
  });

  test("should handle commands with multiple arguments", async () => {
    CommandRegistry.register(
      "multiArgsCommand",
      async (a: number, b: number, c: number) => a + b + c
    );

    const result = await CommandRegistry.execute("multiArgsCommand", 1, 2, 3);

    expect(result).toBe(6);
  });

  test("should throw an error if middleware modifies context.command", async () => {
    CommandRegistry.usePre(async (context, next) => {
      // Attempt to modify the command name
      (context as any).command = "modifiedCommand"; // This will fail due to immutability
      await next();
    });

    CommandRegistry.register("originalCommand", async () => "Original");

    await expect(CommandRegistry.execute("originalCommand")).rejects.toThrow(
      "Middleware cannot modify the command name."
    );
  });

  test("should allow middleware to modify arguments", async () => {
    CommandRegistry.usePre(async (context, next) => {
      context.args[0] = "Modified";
      await next();
    });

    CommandRegistry.register("modifyArgsCommand", async (arg: string) => `Result: ${arg}`);

    const result = await CommandRegistry.execute("modifyArgsCommand", "Original");

    expect(result).toBe("Result: Modified");
  });

  test("should allow middleware to modify the result", async () => {
    CommandRegistry.usePost(async (context, next) => {
      await next();
      context.result = `Modified: ${context.result}`;
    });

    CommandRegistry.register("modifyResultCommand", async () => "Original Result");

    const result = await CommandRegistry.execute("modifyResultCommand");

    expect(result).toBe("Modified: Original Result");
  });

  test("should handle deeply nested middleware chains", async () => {
    for (let i = 0; i < 100; i++) {
      CommandRegistry.usePre(async (context, next) => {
        await next();
      });
    }

    CommandRegistry.register("nestedMiddlewareCommand", async () => "Success");

    const result = await CommandRegistry.execute("nestedMiddlewareCommand");

    expect(result).toBe("Success");
  });

  test("should handle middleware that skips execution by not calling next()", async () => {
    CommandRegistry.usePre(async () => {
      // Intentionally not calling next()
    });

    CommandRegistry.register("skippedCommand", async () => "Should not execute");

    await expect(CommandRegistry.execute("skippedCommand")).rejects.toThrow(
      "Middleware chain interrupted: next() was not called."
    );
  });

  test("should handle middleware that throws an error after calling next()", async () => {
    CommandRegistry.usePre(async (context, next) => {
      await next();
      throw new Error("Error after next()");
    });

    CommandRegistry.register("errorAfterNextCommand", async () => "Result");

    await expect(CommandRegistry.execute("errorAfterNextCommand")).rejects.toThrow(
      "Error after next()"
    );
  });

  test("should handle commands with complex return types", async () => {
    CommandRegistry.register("complexReturnCommand", async () => ({
      success: true,
      data: [1, 2, 3],
    }));

    const result = await CommandRegistry.execute("complexReturnCommand");

    expect(result).toEqual({ success: true, data: [1, 2, 3] });
  });

  test("should handle commands that return promises", async () => {
    CommandRegistry.register("promiseCommand", async () => {
      return new Promise((resolve) => setTimeout(() => resolve("Resolved Promise"), 100));
    });

    const result = await CommandRegistry.execute("promiseCommand");

    expect(result).toBe("Resolved Promise");
  });

  test("should handle commands that return undefined", async () => {
    CommandRegistry.register("undefinedCommand", async () => undefined);

    const result = await CommandRegistry.execute("undefinedCommand");

    expect(result).toBeUndefined();
  });

  test("should handle commands that return null", async () => {
    CommandRegistry.register("nullCommand", async () => null);

    const result = await CommandRegistry.execute("nullCommand");

    expect(result).toBeNull();
  });

  test("should handle commands with invalid names", async () => {
    expect(() => CommandRegistry.register("", async () => "Invalid")).toThrow(
      "Command name cannot be empty."
    );
    expect(() => CommandRegistry.register(null as any, async () => "Invalid")).toThrow(
      "Command name cannot be null or undefined."
    );
    expect(() => CommandRegistry.register(undefined as any, async () => "Invalid")).toThrow(
      "Command name cannot be null or undefined."
    );
  });

  test("should handle commands with special characters in names", async () => {
    CommandRegistry.register("special:command", async () => "Special Command Executed");

    const result = await CommandRegistry.execute("special:command");

    expect(result).toBe("Special Command Executed");
  });
});

describe("CommandRegistry - validateCommandName", () => {
  test("should throw an error for null or undefined command names", () => {
    expect(() => CommandRegistry["validateCommandName"](null as any)).toThrow(
      "Command name cannot be null or undefined."
    );
    expect(() => CommandRegistry["validateCommandName"](undefined as any)).toThrow(
      "Command name cannot be null or undefined."
    );
  });

  test("should throw an error for non-string command names", () => {
    expect(() => CommandRegistry["validateCommandName"](123 as any)).toThrow(
      "Command name must be a string."
    );
    expect(() => CommandRegistry["validateCommandName"]({} as any)).toThrow(
      "Command name must be a string."
    );
    expect(() => CommandRegistry["validateCommandName"](true as any)).toThrow(
      "Command name must be a string."
    );
  });

  test("should throw an error for empty or whitespace-only command names", () => {
    expect(() => CommandRegistry["validateCommandName"]("")).toThrow(
      "Command name cannot be empty."
    );
    expect(() => CommandRegistry["validateCommandName"]("   ")).toThrow(
      "Command name cannot be empty."
    );
  });

  test("should throw an error for command names containing spaces", () => {
    expect(() => CommandRegistry["validateCommandName"]("invalid command")).toThrow(
      "Command name cannot contain spaces."
    );
  });

  test("should throw an error for excessively long command names", () => {
    const longCommand = "a".repeat(256);
    expect(() => CommandRegistry["validateCommandName"](longCommand)).toThrow(
      "Command name cannot exceed 255 characters."
    );
  });

  test("should throw an error for command names with invalid characters", () => {
    expect(() => CommandRegistry["validateCommandName"]("invalid@command")).toThrow();
    expect(() => CommandRegistry["validateCommandName"]("invalid#command")).toThrow();
  });

  test("should throw an error for purely numeric command names", () => {
    expect(() => CommandRegistry["validateCommandName"]("12345")).toThrow(
      "Command name cannot be a number."
    );
  });

  test("should allow valid command names", () => {
    expect(() => CommandRegistry["validateCommandName"]("validCommand")).not.toThrow();
    expect(() => CommandRegistry["validateCommandName"]("valid-command")).not.toThrow();
    expect(() => CommandRegistry["validateCommandName"]("valid:command")).not.toThrow();
    expect(() => CommandRegistry["validateCommandName"]("valid123")).not.toThrow();
  });
});

describe("CommandRegistry - Additional Brutal Tests", () => {
  beforeEach(() => {
    // Clear all registered commands and middlewares before each test
    (CommandRegistry as any).commands.clear();
    (CommandRegistry as any).preMiddleware.length = 0;
    (CommandRegistry as any).postMiddleware.length = 0;
  });

  // Test 1: Ensure commands with similar names are treated as distinct
  test("should treat commands with similar names as distinct", async () => {
    CommandRegistry.register("command1", async () => "Command 1");
    CommandRegistry.register("command1:sub", async () => "Command 1 Sub");

    const result1 = await CommandRegistry.execute("command1");
    const result2 = await CommandRegistry.execute("command1:sub");

    expect(result1).toBe("Command 1");
    expect(result2).toBe("Command 1 Sub");
  });

  // Test 2: Ensure middlewares do not interfere with each other
  test("should ensure middlewares do not interfere with each other", async () => {
    const preMiddleware1 = jest.fn(async (context, next) => {
      context.args[0] = `${context.args[0]}-Pre1`;
      await next();
    });

    const preMiddleware2 = jest.fn(async (context, next) => {
      context.args[0] = `${context.args[0]}-Pre2`;
      await next();
    });

    CommandRegistry.usePre(preMiddleware1);
    CommandRegistry.usePre(preMiddleware2);

    CommandRegistry.register("testCommand", async (arg: string) => `Result: ${arg}`);

    const result = await CommandRegistry.execute("testCommand", "Input");

    expect(preMiddleware1).toHaveBeenCalled();
    expect(preMiddleware2).toHaveBeenCalled();
    expect(result).toBe("Result: Input-Pre1-Pre2");
  });

  // Test 3: Ensure post-middlewares do not modify the result if not intended
  test("should ensure post-middlewares do not modify the result unintentionally", async () => {
    const postMiddleware1 = jest.fn(async (context, next) => {
      await next();
    });

    const postMiddleware2 = jest.fn(async (context, next) => {
      await next();
    });

    CommandRegistry.usePost(postMiddleware1);
    CommandRegistry.usePost(postMiddleware2);

    CommandRegistry.register("testCommand", async () => "Original Result");

    const result = await CommandRegistry.execute("testCommand");

    expect(postMiddleware1).toHaveBeenCalled();
    expect(postMiddleware2).toHaveBeenCalled();
    expect(result).toBe("Original Result");
  });

  // Test 4: Ensure middlewares can handle exceptions gracefully
  test("should ensure middlewares handle exceptions gracefully", async () => {
    CommandRegistry.usePre(async (context, next) => {
      throw new Error("Middleware error");
    });

    CommandRegistry.register("testCommand", async () => "Result");

    await expect(CommandRegistry.execute("testCommand")).rejects.toThrow("Middleware error");
  });

  // Test 5: Ensure commands can handle large arguments
  test("should handle commands with large arguments", async () => {
    const largeArgument = "a".repeat(1000000); // 1 million characters

    CommandRegistry.register("largeArgCommand", async (arg: string) => `Length: ${arg.length}`);

    const result = await CommandRegistry.execute("largeArgCommand", largeArgument);

    expect(result).toBe("Length: 1000000");
  });

  // Test 6: Ensure commands can handle deeply nested middleware chains
  test("should handle deeply nested middleware chains", async () => {
    for (let i = 0; i < 100; i++) {
      CommandRegistry.usePre(async (context, next) => {
        await next();
      });
    }

    CommandRegistry.register("nestedMiddlewareCommand", async () => "Success");

    const result = await CommandRegistry.execute("nestedMiddlewareCommand");

    expect(result).toBe("Success");
  });

  // Test 7: Ensure commands can handle multiple concurrent executions
  test("should handle multiple concurrent executions of the same command", async () => {
    CommandRegistry.register("concurrentCommand", async (delay: number) => {
      return new Promise((resolve) => setTimeout(() => resolve(`Done in ${delay}ms`), delay));
    });

    const results = await Promise.all([
      CommandRegistry.execute("concurrentCommand", 100),
      CommandRegistry.execute("concurrentCommand", 200),
      CommandRegistry.execute("concurrentCommand", 300),
    ]);

    expect(results).toEqual(["Done in 100ms", "Done in 200ms", "Done in 300ms"]);
  });

  // Test 8: Ensure commands with invalid arguments throw errors
  test("should throw an error for commands with invalid arguments", async () => {
    CommandRegistry.register("invalidArgsCommand", async (arg: number) => {
      if (typeof arg !== "number") {
        throw new Error("Invalid argument");
      }
      return arg * 2;
    });

    await expect(CommandRegistry.execute("invalidArgsCommand", "not-a-number")).rejects.toThrow(
      "Invalid argument"
    );
  });

  // Test 9: Ensure commands can handle null or undefined arguments
  test("should handle commands with null or undefined arguments", async () => {
    CommandRegistry.register("nullArgCommand", async (arg: any) => {
      if (arg == null) {
        return "No argument provided";
      }
      return `Argument: ${arg}`;
    });

    const result1 = await CommandRegistry.execute("nullArgCommand", null);
    const result2 = await CommandRegistry.execute("nullArgCommand", undefined);

    expect(result1).toBe("No argument provided");
    expect(result2).toBe("No argument provided");
  });

  // Test 10: Ensure commands with reserved names throw errors
  test("should throw an error for commands with reserved names", () => {
    const reservedKeywords = [
      "constructor",
      "__proto__",
      "prototype",
      "toString",
      "valueOf",
      "hasOwnProperty",
      "isPrototypeOf",
      "propertyIsEnumerable",
      "apply",
      "call",
      "bind",
      "length",
      "name",
      "arguments",
      "eval",
      "undefined",
      "null",
      "NaN",
      "Infinity",
      "globalThis",
      "window",
      "document",
      "alert",
      "console",
      "process",
      "require",
      "module",
      "exports",
    ];

    // Reserved keywords should throw an error
    for (const keyword of reservedKeywords) {
      expect(() => CommandRegistry.register(keyword, async () => "Invalid")).toThrow();
    }

    // Valid command names containing reserved keywords as substrings should not throw
    expect(() =>
      CommandRegistry.register("my:constructor:command", async () => "Valid")
    ).not.toThrow();
    expect(() => CommandRegistry.register("custom:__proto__", async () => "Valid")).not.toThrow();
    expect(() => CommandRegistry.register("toString:example", async () => "Valid")).not.toThrow();
  });

  // Test 11: Ensure commands can handle circular references in arguments
  test("should handle commands with circular references in arguments", async () => {
    const circularObject: any = {};
    circularObject.self = circularObject;

    CommandRegistry.register("circularArgCommand", async (arg: any) => {
      return JSON.stringify(arg, (key, value) => (key === "self" ? "[Circular]" : value));
    });

    const result = await CommandRegistry.execute("circularArgCommand", circularObject);

    expect(result).toContain('"self":"[Circular]"');
  });

  // Test 12: Ensure commands can handle extremely high concurrency
  test("should handle extremely high concurrency", async () => {
    CommandRegistry.register("highConcurrencyCommand", async (id: number) => `Result: ${id}`);

    const promises = Array.from({ length: 1000 }, (_, i) =>
      CommandRegistry.execute("highConcurrencyCommand", i)
    );

    const results = await Promise.all(promises);

    expect(results).toHaveLength(1000);
    expect(results[0]).toBe("Result: 0");
    expect(results[999]).toBe("Result: 999");
  });


  test("should handle promises in middleware", async () => {
    const executionOrder: string[] = [];
  
    CommandRegistry.usePre(async (context, next) => {
      executionOrder.push("middleware1-start");
      await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate async operation
      executionOrder.push("middleware1-end");
      await next();
    });
  
    CommandRegistry.usePre(async (context, next) => {
      executionOrder.push("middleware2-start");
      await new Promise((resolve) => setTimeout(resolve, 30)); // Simulate async operation
      executionOrder.push("middleware2-end");
      await next();
    });
  
    CommandRegistry.register("testCommand", async () => {
      executionOrder.push("handler");
    });
  
    await CommandRegistry.execute("testCommand");
  
    expect(executionOrder).toEqual([
      "middleware1-start",
      "middleware1-end",
      "middleware2-start",
      "middleware2-end",
      "handler",
    ]);
  });


  test("should throw an error if middleware interrupts the chain without providing a result", async () => {
    CommandRegistry.usePre(async (context, next) => {
      // Intentionally not calling next() and not setting context.result
    });
  
    CommandRegistry.register("testCommand", async () => "Handler executed");
  
    await expect(CommandRegistry.execute("testCommand")).rejects.toThrow(
      "Middleware chain interrupted: next() was not called."
    );
  });

  test("should handle commands with a large number of arguments", async () => {
    CommandRegistry.register("sum", async (...args: number[]) => args.reduce((a, b) => a + b, 0));
  
    const result = await CommandRegistry.execute("sum", ...Array.from({ length: 1000 }, (_, i) => i + 1));
  
    expect(result).toBe(500500); // Sum of numbers from 1 to 1000
  });

  test("should handle errors in middleware gracefully", async () => {
    CommandRegistry.usePre(async (context, next) => {
      throw new Error("Middleware error");
    });
  
    CommandRegistry.register("testCommand", async () => "Handler executed");
  
    await expect(CommandRegistry.execute("testCommand")).rejects.toThrow("Middleware error");
  });


  test("should handle edge cases in arguments", async () => {
    CommandRegistry.register("testCommand", async (arg: any) => {
      if (arg == null) return "Argument is null or undefined";
      if (arg === "") return "Argument is an empty string";
      return `Argument: ${arg}`;
    });
  
    expect(await CommandRegistry.execute("testCommand", null)).toBe("Argument is null or undefined");
    expect(await CommandRegistry.execute("testCommand", undefined)).toBe("Argument is null or undefined");
    expect(await CommandRegistry.execute("testCommand", "")).toBe("Argument is an empty string");
    expect(await CommandRegistry.execute("testCommand", "Valid")).toBe("Argument: Valid");
  });


  test("should handle nested command execution", async () => {
    CommandRegistry.register("innerCommand", async () => "Inner Result");
    CommandRegistry.register("outerCommand", async () => {
      return `Outer Result + ${await CommandRegistry.execute("innerCommand")}`;
    });
  
    const result = await CommandRegistry.execute("outerCommand");
  
    expect(result).toBe("Outer Result + Inner Result");
  });


  test("should handle dynamic middleware registration", async () => {
    CommandRegistry.usePre(async (context, next) => {
      context.args[0] = `${context.args[0]}-Pre1`;
      await next();
    });
  
    CommandRegistry.register("testCommand", async (arg: string) => `Result: ${arg}`);
  
    // Dynamically register another middleware
    CommandRegistry.usePre(async (context, next) => {
      context.args[0] = `${context.args[0]}-Pre2`;
      await next();
    });
  
    const result = await CommandRegistry.execute("testCommand", "Input");
  
    expect(result).toBe("Result: Input-Pre1-Pre2");
  });


  test("should allow middleware to log execution details", async () => {
    const log: string[] = [];
  
    CommandRegistry.usePre(async (context, next) => {
      log.push(`Executing command: ${context.command}`);
      await next();
    });
  
    CommandRegistry.register("logCommand", async () => "Logged");
  
    const result = await CommandRegistry.execute("logCommand");
  
    expect(result).toBe("Logged");
    expect(log).toContain("Executing command: logCommand");
  });


  
});
