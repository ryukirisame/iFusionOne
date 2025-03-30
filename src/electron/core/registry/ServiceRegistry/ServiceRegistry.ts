import Service from "../../services/Service.js";

/**
 * Type definition for service constructors.
 */
type ServiceConstructor<T extends Service, Args extends any[] = []> = new (...args: Args) => T;

/**
 * ServiceRegistry is a static registry class that manages service instances.
 * It allows registering services and getting instances of them.
 *
 * @example
 *
 * // Register a service
 * ServiceRegistry.registerService("ExtensionService", ExtensionService);
 *
 * // Get a service instance
 * const extensionService = ServiceRegistry.getService("ExtensionService"); // Example 1
 * const logger = ServiceRegistry.getService<LoggerService, [string]>("LoggerService", "App"); // Example 2
 *
 * // Shutdown all services
 * ServiceRegistry.stopAllService();
 */
export class ServiceRegistry {

  /**
   * A nested map to store service instances.
   * The structure is: serviceName -> argsKey -> instance.
   */
  private static services = new Map<string, Map<string, any>>(); 

  /**
   * A map to store service constructors (factories).
   * The structure is: serviceName -> serviceConstructor.
   */
  private static factories = new Map<string, ServiceConstructor<any, any>>();

  /**
   * Register a service class (without creating it immediately)
   * 
   * @param name - Name of the service.
   * @param serviceClass - Service class to be registered.
   * @throws Error if a service with the same name is already registered.
   * @throws Error if the service name is invalid.
   * @throws Error if the serviceClass doesn't implement the `start()` and `stop()` methods.
   */
  static registerService<T extends Service, Args extends any[] = []>(
    name: string,
    serviceClass: ServiceConstructor<T, Args>
  ) {
    // Validate the service name
    try {
      this.validateServiceName(name);
    } catch (error) {
      throw new Error("Invalid service name: " + error);
    }

    // Check if the service is already registered
    if (this.factories.has(name)) {
      throw new Error(`Service ${name} is already registered.`);
    }

    // Ensure the service class implements the required methods
    if (
      typeof serviceClass.prototype.start !== "function" ||
      typeof serviceClass.prototype.stop !== "function"
    ) {
      throw new Error(`Service ${name} must implement the start() and stop() methods.`);
    }

    this.factories.set(name, serviceClass); // Store the service class
  }

  /**
   * Unregister a service by name
   * @param name - The name of the service to unregister
   * @returns `true` if the service was unregistered, `false` otherwise.
   * @throws Error if the service name is invalid.
   */
  static unregisterService(name: string): boolean {
    // Validate the service name
    try {
      this.validateServiceName(name);
    } catch (error) {
      throw new Error("Invalid service name: " + error);
    }

    if (!this.factories.has(name)) return false;

    this.factories.delete(name);
    this.stopService(name);
    this.services.delete(name);

    return true;
  }

  /**
   * List all instances of a service.
   *
   * @param name - Name of the service
   * @returns An array of argument lists for each instance if the service is running. Returns an empty array if the service is not running.
   * @throws Error if the service name is invalid.
   */
  static listServiceInstances(name: string): unknown[][] | [] {
    // Validate the service name
    try {
      this.validateServiceName(name);
    } catch (error) {
      throw new Error("Invalid service name: " + error);
    }

    const instances = this.services.get(name);

    if (!instances) {
      return [];
    }

    return Array.from(instances.keys()).map((argsKey) => JSON.parse(argsKey));
  }

  /**
   * List all running services.
   * @returns An array of all running service names.
   */
  static listRunningServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Starts a service. If the service is already running, returns the existing instance.
   * @param name - Name of the service
   * @param args - Arguments to pass to the service constructor
   * @returns The service instance
   * @throws Error if the service is not registered.
   * @throws Error if the service name is invalid.
   */
  static startService<T extends keyof ServicesList, Args extends any[] = []>(name: string, ...args: Args): T {
    // Validate the service name
    try {
      this.validateServiceName(name);
    } catch (error) {
      throw new Error("Invalid service name: " + error);
    }

    // First check if the service is already running. If so, return the instance.
    const argsKey = JSON.stringify(args); // The default key will be "[]", if args to the constructor is empty.

    if (this.services.has(name) && this.services.get(name)!.has(argsKey)) {
      console.log(`Service ${name} is already running.`);
      return this.services.get(name)!.get(argsKey) as T;
    }

    // Retrieve the factory function
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service ${name} is not registered.`);
    }

    // Create a new instance of the service
    const instance = new factory(...args);

    // Store the service instance
    if (!this.services.has(name)) {
      this.services.set(name, new Map());
    }
    this.services.get(name)!.set(argsKey, instance);

    // If the service has a start() method, call it
    if (typeof instance.start === "function") {
      instance.start();
    }

    return instance;
  }

  /**
   * Get a service instance. If the service is not running, starts it.
   *
   * @param name - Name of the service
   * @param [args = []] - Arguments to pass to the service constructor
   * @returns The service instance
   * @throws Error if the service is not registered.
   * @throws Error if the service name is invalid.
   */
  static getService<T extends keyof ServicesList, Args extends any[] = []>(
    name: T,
    ...args: Args
  ): T {
    // Validate the service name
    try {
      this.validateServiceName(name);
    } catch (error) {
      throw new Error("Invalid service name: " + error);
    }

    // First check if the service is already running
    const argsKey = JSON.stringify(args); // The default key will be "[]", if args is empty
    if (this.services.has(name) && this.services.get(name)!.has(argsKey)) {
      return this.services.get(name)!.get(argsKey) as T;
    }

    // If the service is not running, start it and return the instance
    return this.startService<T, Args>(name, ...args);
  }

  /**
   * Check whether a particular service is running.
   * @param name - The name of the service to check.
   * @param args - Arguments to uniquely identify the service instance (optional).
   * @returns `true` if the service is running, `false` otherwise.
   * @throws Error if the service name is invalid.
   */
  static isServiceRunning(name: string, ...args: any[]): boolean {
    // Validate the service name
    try {
      this.validateServiceName(name);
    } catch (error) {
      throw new Error("Invalid service name: " + error);
    }

    // Check if the service is running
    if (!this.services.has(name)) {
      return false;
    }

    const instances = this.services.get(name);
    if (!instances) return false;

    // Convert arguments to a string key and check if the instance exists
    const argsKey = JSON.stringify(args);
    return instances.has(argsKey);
  }

  /**
   * Restarts a service.
   * @param name - The name of the service to restart
   * @param args - Arguments to pass to the service constructor
   * @returns The service instance
   * @throws Error if the service is not registered.
   * @throws Error if the service is not running.
   * @throws Error if the service name is invalid.
   * 
   */
  static restartService<T extends keyof ServicesList, Args extends any[] = []>(name: string, ...args: Args): T {
    // Validate the service name
    try {
      this.validateServiceName(name);
    } catch (error) {
      throw new Error("Invalid service name: " + error);
    }

    // Check if the service is registered, if not throw an error
    if (!this.factories.has(name)) {
      throw new Error(`Service ${name} is not registered.`);
    }

    // Check if the service is running, if not throw an error
    if (!this.isServiceRunning(name, ...args)) {
      throw new Error(`Service ${name} is not running.`);
    }

    // Stop the service and start it again
    this.stopService(name);
    return this.startService<T, Args>(name, ...args);
  }

  /**
   * Shutdown a specific service by name.
   * @param name - The name of the service to shut down.
   * @returns `true` if the service was successfully shut down, `false` if the service was not registered.
   * @throws Error if the service name is invalid.
   */
  static stopService(name: string): boolean {
    // Validate the service name
    try {
      this.validateServiceName(name);
    } catch (error) {
      throw new Error("Invalid service name: " + error);
    }

    const instances = this.services.get(name);
    if (!instances) {
      console.warn(`Service ${name} is not registered.`);
      return false;
    }

    // Calling the stop() method on each instance
    for (const [argsKey, instance] of instances) {
      if (typeof instance.stop === "function") {
        instance.stop();
      }
    }

    // Clear all instances of the service
    this.services.delete(name);

    console.log(`Service ${name} has been shut down.`);
    return true;
  }

  /** Stops all services */
  static stopAllService() {
    const serviceNames = Array.from(this.services.keys());

    for (const name of serviceNames) {
      this.stopService(name);
    }

    this.services.clear();
    console.log("All services have been shut down.");
  }

  /**
   * Validates a service name to ensure it meets the required criteria.
   * 
   * @param name - The name of the service to validate.
   * @throws Error if the service name is invalid.
   */
  private static validateServiceName(name: any): void {
    // Check for null or undefined
    if (name == null || name == undefined) {
      throw new Error("Service name cannot be null or undefined.");
    }

    // Check for non-string types
    if (typeof name !== "string") {
      throw new Error("Service name must be a string.");
    }

    // Trim whitespace to handle cases like "   " or empty strings
    const trimmedName = name.trim();

    // Check for empty string after trimming
    if (trimmedName.length === 0) {
      throw new Error("Service name cannot be an empty string.");
    }

    // Check for only whitespace characters
    if (!/\S/.test(name)) {
      throw new Error("Service name cannot contain only whitespace characters.");
    }

    // Check for excessively long names (you can adjust the length limit as needed)
    const maxLength = 255;
    if (trimmedName.length > maxLength) {
      throw new Error(
        `Service name is too long. Maximum allowed length is ${maxLength} characters.`
      );
    }

    // Check for excessively short names
    const minLength = 1;
    if (trimmedName.length < minLength) {
      throw new Error(
        `Service name is too short. Minimum allowed length is ${minLength} characters.`
      );
    }

    // Check for invalid characters (only allow alphanumeric, hyphens, and underscores)
    const invalidCharacters = /[^a-zA-Z0-9-_]/;
    if (invalidCharacters.test(trimmedName)) {
      throw new Error(
        `Service name "${name}" contains invalid characters. Only alphanumeric characters, hyphens, and underscores are allowed.`
      );
    }

    // Disallow purely numeric names to avoid confusion with IDs
    if (/^\d+$/.test(trimmedName)) {
      throw new Error("Service name cannot be purely numeric.");
    }

    // Disallow leading or trailing hyphens/underscores
    if (/^[-_]|[-_]$/.test(trimmedName)) {
      throw new Error("Service name cannot start or end with a hyphen or underscore.");
    }

    // Disallow consecutive hyphens or underscores
    if (/[-_]{2,}/.test(trimmedName)) {
      throw new Error("Service name cannot contain consecutive hyphens or underscores.");
    }
  }

  /**
   * Clear all services from the registry.
   * For testing purposes only.
   */
  static clearAll() {
    this.services.clear();
    this.factories.clear();
  }
}


