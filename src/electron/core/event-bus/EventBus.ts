


// For test purpose only
// interface EventDataMapping {
//   "extension:loaded": { extensionId: number  };
//   "event1": {key: string};
//   "event2": {key: string}'
// }

/**
 * Type definition for pre-middleware functions.
 * These functions can modify event data before handlers are executed.
 */
type PreMiddleWare = (event: string, data: any) => Promise<any> | any;

/**
 * Type definition for post-middleware functions.
 * These functions run after event handlers and cannot modify event data.
 */
type PostMiddleWare = (event: string, data: any) => void | Promise<void>;

/**
 * Custom Event Bus system  that supports:
 * - Event subscription and unsubscription.
 * - Middleware for pre-processing and post-processing events.
 *
 *
 * @example
 * interface EventDataMapping {
 *   "user:login": { username: string };
 *   "file:uploaded": { fileId: number };
 * }
 *
 * // Register event handlers
 * EventBus.on("user:login", (data) => {
 *   console.log(`User logged in: ${data.username}`);
 * });
 *
 * // Register pre-middleware
 * EventBus.usePre(async (event, data) => {
 *   console.log(`[PRE] Event: ${event}`, data);
 *   return data; // Return modified data if needed
 * });
 *
 * // Emit an event
 * EventBus.emit("user:login", { username: "Alice" });
 *
 * // Register post-middleware
 * EventBus.usePost(async (event, data) => {
 *   console.log(`[POST] Event: ${event} processed.`);
 * });
 */
export default class EventBus {
  /** Stores event handlers mapped by event names. */
  private static events: Record<string, Function[]> = {};

  /** List of pre-middleware functions that run before event handlers. */
  private static preMiddleware: PreMiddleWare[] = [];

  /** List of post-middleware functions that run after event handlers. */
  private static postMiddleware: PostMiddleWare[] = [];

  /**
   * Registers a pre-middleware function.
   * Pre-middleware runs before the event handlers and can modify event data.
   *
   * @param middleware - A function to process event data before handlers execute.
   */
  static usePre(middleware: PreMiddleWare) {
    this.preMiddleware.push(middleware);
  }

  /**
   * Registers a post-middleware function.
   * Post-middleware runs after the event handlers but cannot modify event data.
   *
   * @param middleware - A function to run after event handlers.
   */
  static usePost(middleware: PostMiddleWare) {
    this.postMiddleware.push(middleware);
  }

  /**
   * Subscribes a handler to a specific event.
   *
   * @param event - The event name.
   * @param handler - A function to be called when the event is emitted.
   */
  static on<E extends keyof EventDataMapping>(
    event: E,
    handler: (data: EventDataMapping[E]) => void
  ): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler);
  }

  /**
   * Unsubscribes a handler from a specific event.
   *
   * @param event - The event name.
   * @param handler - The function to be removed from the event listeners.
   */
  static off<E extends keyof EventDataMapping>(
    event: E,
    handler?: (data: EventDataMapping[E]) => void
  ) {

    if(!this.events[event]) return ;

    if (handler) {
      // Remove the specific handler
      this.events[event] = this.events[event].filter((h) => h !== handler);
    }
    else{
      // Remove all handlers for the event
      delete this.events[event];
    }
  }

  /**
   * Emits an event, triggering all subscribed handlers and middleware.
   *
   * @param event - The event name.
   * @param data - The event data.
   */
  static async emit<E extends keyof EventDataMapping>(event: E, data: EventDataMapping[E]) {
    
    // Executing pre-hooks
    for (const middleware of this.preMiddleware) {
      try {
        const result = await middleware(event, Object.freeze({ ...data })); // Pass a frozen copy
        
        if (result !== undefined) {
          Object.assign(data, result); // Merge the result back into the original `data`
        }
        
      } catch (error) {
        console.error(`Error in pre-hook for event ${event}:`, error);
      }
    }

    // Call event handlers
    if (this.events[event]) {
      for (const handler of this.events[event]) {
        await handler(data);
      }
    }

    // Executing post-hooks with a frozen copy of 'data'
    const frozenData = Object.freeze({...data}); // Create a shallow frozen copy
    for (const middleware of this.postMiddleware) {
      try {
        await middleware(event, frozenData);
      } catch (error) {
        console.error(`Error in post-hook for event ${event}`);
      }
    }
  }
}


