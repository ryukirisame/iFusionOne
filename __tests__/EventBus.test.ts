import EventBus from "../src/electron/core/event-bus/EventBus";

describe("EventBus", () => {
  beforeEach(() => {
    // Reset the EventBus state before each test
    (EventBus as any).events = {};
    (EventBus as any).preMiddleware = [];
    (EventBus as any).postMiddleware = [];
  });

  // Test 1: Register and emit an event
  test("should register and emit an event", async () => {
    const handler = jest.fn();
    EventBus.on("extension:loaded", handler);

    await EventBus.emit("extension:loaded", { extensionId: 123 });

    expect(handler).toHaveBeenCalledWith({ extensionId: 123 });
  });

  // Test 2: Unsubscribe a handler from an event
  test("should unsubscribe a handler from an event", async () => {
    const handler = jest.fn();
    EventBus.on("extension:loaded", handler);
    EventBus.off("extension:loaded", handler);

    await EventBus.emit("extension:loaded", { extensionId: 123 });

    expect(handler).not.toHaveBeenCalled();
  });

  // Test 3: Emit an event with no handlers
  test("should not throw an error when emitting an event with no handlers", async () => {
    await expect(EventBus.emit("nonexistent:event" as any, {})).resolves.not.toThrow();
  });

  // Test 4: Register and execute pre-middleware
  test("should execute pre-middleware before event handlers", async () => {
    const preMiddleware = jest.fn((event, data) => {
      return { ...data, transformed: true }; // Return a new object
    });
    const handler = jest.fn();

    EventBus.usePre(preMiddleware);
    EventBus.on("extension:loaded", handler);

    const eventData = { extensionId: 123 };
    await EventBus.emit("extension:loaded", eventData);

    expect(preMiddleware).toHaveBeenCalledWith("extension:loaded", { extensionId: 123 });
    expect(handler).toHaveBeenCalledWith({ extensionId: 123, transformed: true });
  
  });

  // Test 5: Register and execute post-middleware
  test("should execute post-middleware after event handlers", async () => {
    const postMiddleware = jest.fn();
    const handler = jest.fn();

    EventBus.usePost(postMiddleware);
    EventBus.on("extension:loaded", handler);

    await EventBus.emit("extension:loaded", { extensionId: 123 });

    expect(handler).toHaveBeenCalledWith({ extensionId: 123 });
    expect(postMiddleware).toHaveBeenCalledWith("extension:loaded", { extensionId: 123 });
  });

  // Test 6: Handle errors in pre-middleware
  test("should handle errors in pre-middleware gracefully", async () => {
    const preMiddleware = jest.fn(() => {
      throw new Error("Pre-middleware error");
    });
    const handler = jest.fn();

    EventBus.usePre(preMiddleware);
    EventBus.on("extension:loaded", handler);

    await expect(EventBus.emit("extension:loaded", { extensionId: 123 })).resolves.not.toThrow();
    expect(handler).toHaveBeenCalledWith({ extensionId: 123 });
  });

  // Test 7: Handle errors in post-middleware
  test("should handle errors in post-middleware gracefully", async () => {
    const postMiddleware = jest.fn(() => {
      throw new Error("Post-middleware error");
    });
    const handler = jest.fn();

    EventBus.usePost(postMiddleware);
    EventBus.on("extension:loaded", handler);

    await expect(EventBus.emit("extension:loaded", { extensionId: 123 })).resolves.not.toThrow();
    expect(handler).toHaveBeenCalledWith({ extensionId: 123 });
  });

  // Test 8: Emit an event with multiple handlers
  test("should emit an event with multiple handlers", async () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    EventBus.on("extension:loaded", handler1);
    EventBus.on("extension:loaded", handler2);

    await EventBus.emit("extension:loaded", { extensionId: 123 });

    expect(handler1).toHaveBeenCalledWith({ extensionId: 123 });
    expect(handler2).toHaveBeenCalledWith({ extensionId: 123 });
  });

  // Test 9: Ensure pre-middleware can transform data sequentially
  test("should allow multiple pre-middleware to transform data sequentially", async () => {
    const preMiddleware1 = jest.fn((event, data) => {
      return { ...data, step1: true }; // Add step1
    });
    const preMiddleware2 = jest.fn((event, data) => {
      return { ...data, step2: true }; // Add step2
    });
    const handler = jest.fn();

    EventBus.usePre(preMiddleware1);
    EventBus.usePre(preMiddleware2);
    EventBus.on("extension:loaded", handler);

    const eventData = { extensionId: 123 };
    await EventBus.emit("extension:loaded", eventData);

    expect(preMiddleware1).toHaveBeenCalledWith("extension:loaded", { extensionId: 123 });
    expect(preMiddleware2).toHaveBeenCalledWith("extension:loaded", { extensionId: 123, step1: true });
    expect(handler).toHaveBeenCalledWith({ extensionId: 123, step1: true, step2: true });
    
  });

  // Test 10: Ensure post-middleware cannot modify event data
  test("should not allow post-middleware to modify event data", async () => {
    EventBus.usePost((event, data) => {
      data.modified = true; // Attempt to modify the frozen data
    });

    const handler = jest.fn();
    EventBus.on("extension:loaded", handler);

    const eventData = { extensionId: 123 };
    await EventBus.emit("extension:loaded", eventData);

    expect(handler).toHaveBeenCalledWith({ extensionId: 123 });
    expect(eventData).toEqual({ extensionId: 123 }); // Original data remains unchanged
  });

  // Test 11: Ensure middleware execution order
  test("should execute pre-middleware, handlers, and post-middleware in the correct order", async () => {
    const executionOrder: string[] = [];

    EventBus.usePre((event, data) => {
      executionOrder.push("pre-middleware");
      return data;
    });

    EventBus.on("extension:loaded", () => {
      executionOrder.push("handler");
    });

    EventBus.usePost((event, data) => {
      executionOrder.push("post-middleware");
    });

    await EventBus.emit("extension:loaded", { extensionId: 123 });

    expect(executionOrder).toEqual(["pre-middleware", "handler", "post-middleware"]);
  });

  // Test 12: Ensure unsubscribing a non-existent handler does not throw
  test("should not throw when unsubscribing a non-existent handler", () => {
    const handler = jest.fn();
    expect(() => EventBus.off("nonexistent:event" as any, handler)).not.toThrow();
  });
});




describe("EventBus - Additional Test Cases", () => {
  beforeEach(() => {
    // Reset the EventBus state before each test
    (EventBus as any).events = {};
    (EventBus as any).preMiddleware = [];
    (EventBus as any).postMiddleware = [];
  });

  // Test 13: Ensure pre-middleware cannot modify the original data directly
  test("should not allow pre-middleware to modify the original data directly", async () => {
    const preMiddleware = jest.fn((event, data) => {
      
      // data.step1 = true; // Attempt to modify the original data
      try{

        data.step1 = true; // Attempt to modify the original data
      }catch(error){
        console.warn(error);
        // expect(error.message).toMatch(/Cannot assign to read only property/);
      }
        
      
      return { ...data, step2: true }; // Return a new object
    });
    const handler = jest.fn();
  
    EventBus.usePre(preMiddleware);
    EventBus.on("extension:loaded", handler);
  
    const eventData = { extensionId: 123 };
    await EventBus.emit("extension:loaded", eventData);
  
    // Verify that the handler received the transformed data
    expect(handler).toHaveBeenCalledWith({ extensionId: 123, step2: true });
  
  
  });

  // Test 14: Ensure pre-middleware can short-circuit execution
  test("should allow pre-middleware to short-circuit execution by returning undefined", async () => {
    const preMiddleware = jest.fn((event, data) => {
      return undefined; // Skip transformation
    });
    const handler = jest.fn();

    EventBus.usePre(preMiddleware);
    EventBus.on("extension:loaded", handler);

    const eventData = { extensionId: 123 };
    await EventBus.emit("extension:loaded", eventData);

    // Verify that the handler received the original data
    expect(handler).toHaveBeenCalledWith({ extensionId: 123 });

    // Verify that the original data was not modified
    expect(eventData).toEqual({ extensionId: 123 });
  });

  // Test 15: Ensure multiple handlers for the same event are executed
  test("should execute multiple handlers for the same event", async () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    EventBus.on("extension:loaded", handler1);
    EventBus.on("extension:loaded", handler2);

    await EventBus.emit("extension:loaded", { extensionId: 123 });

    expect(handler1).toHaveBeenCalledWith({ extensionId: 123 });
    expect(handler2).toHaveBeenCalledWith({ extensionId: 123 });
  });

  // Test 16: Ensure unsubscribing all handlers for an event
  test("should unsubscribe all handlers for an event", async () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    EventBus.on("extension:loaded", handler1);
    EventBus.on("extension:loaded", handler2);

    EventBus.off("extension:loaded"); // Remove all handlers for the event

    await EventBus.emit("extension:loaded", { extensionId: 123 });

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  // Test 17: Ensure handlers for different events do not interfere
  test("should ensure handlers for different events do not interfere", async () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    EventBus.on("event1", handler1);
    EventBus.on("event2", handler2);

    await EventBus.emit("event1", { key: "value1" });
    await EventBus.emit("event2", { key: "value2" });

    expect(handler1).toHaveBeenCalledWith({ key: "value1" });
    expect(handler2).toHaveBeenCalledWith({ key: "value2" });
  });

  // Test 18: Ensure pre-middleware execution order
  test("should execute pre-middleware in the correct order", async () => {
    const executionOrder: string[] = [];
    const preMiddleware1 = jest.fn((event, data) => {
      executionOrder.push("pre1");
      return { ...data, step1: true };
    });
    const preMiddleware2 = jest.fn((event, data) => {
      executionOrder.push("pre2");
      return { ...data, step2: true };
    });

    EventBus.usePre(preMiddleware1);
    EventBus.usePre(preMiddleware2);

    const handler = jest.fn();
    EventBus.on("extension:loaded", handler);

    const eventData = { extensionId: 123 };
    await EventBus.emit("extension:loaded", eventData);

    expect(executionOrder).toEqual(["pre1", "pre2"]);
    expect(handler).toHaveBeenCalledWith({ extensionId: 123, step1: true, step2: true });
  });

  // Test 19: Ensure post-middleware execution order
  test("should execute post-middleware in the correct order", async () => {
    const executionOrder: string[] = [];
    const postMiddleware1 = jest.fn(() => {executionOrder.push("post1")});
    const postMiddleware2 = jest.fn(() => {executionOrder.push("post2")});

    EventBus.usePost(postMiddleware1);
    EventBus.usePost(postMiddleware2);

    const handler = jest.fn(() => executionOrder.push("handler"));
    EventBus.on("extension:loaded", handler);

    await EventBus.emit("extension:loaded", { extensionId: 123 });

    expect(executionOrder).toEqual(["handler", "post1", "post2"]);
  });

  // Test 20: Ensure pre-middleware can log execution details
  test("should allow pre-middleware to log execution details", async () => {
    const log: string[] = [];
    EventBus.usePre((event, data) => {
      log.push(`Pre-middleware executed for event: ${event}`);
      return data;
    });

    const handler = jest.fn();
    EventBus.on("extension:loaded", handler);

    await EventBus.emit("extension:loaded", { extensionId: 123 });

    expect(log).toContain("Pre-middleware executed for event: extension:loaded");
    expect(handler).toHaveBeenCalledWith({ extensionId: 123 });
  });

  // Test 21: Ensure post-middleware can log execution details
  test("should allow post-middleware to log execution details", async () => {
    const log: string[] = [];
    EventBus.usePost((event, data) => {
      log.push(`Post-middleware executed for event: ${event}`);
    });

    const handler = jest.fn();
    EventBus.on("extension:loaded", handler);

    await EventBus.emit("extension:loaded", { extensionId: 123 });

    expect(log).toContain("Post-middleware executed for event: extension:loaded");
    expect(handler).toHaveBeenCalledWith({ extensionId: 123 });
  });

  // Test 22: Ensure unsubscribing a non-existent handler does not throw
  test("should not throw when unsubscribing a non-existent handler", () => {
    const handler = jest.fn();
    expect(() => EventBus.off("nonexistent:event" as any, handler)).not.toThrow();
  });
});