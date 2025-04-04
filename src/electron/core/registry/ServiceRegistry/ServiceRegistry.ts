import {
  InvalidArgumentError,
  InvalidClassError,
  ServiceError,
  UnexpectedError,
  ValidationError,
} from "../../errors/index.js";
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
   * Registers a service class in the registry without creating an instance immediately.
   *
   * @template T - The key of the service in the `ServicesList`.
   * @template Args - The arguments required by the service constructor.
   *
   * @param {T} name - The name of the service to register. Must be a valid key in `ServicesList`.
   * @param {ServiceConstructor<ServicesList[T], Args>} serviceClass - The service class to register.
   *
   * @throws {InvalidArgumentError} If the service name is invalid.
   * @throws {ServiceError} If a service with the same name is already registered.
   * @throws {InvalidClassError} If the service class does not implement the required `start()` and `stop()` methods.
   *
   * @example
   * ServiceRegistry.registerService("LoggerService", LoggerService);
   */
  static registerService<T extends keyof ServicesList, Args extends any[] = []>(
    name: T,
    serviceClass: ServiceConstructor<ServicesList[T], Args>
  ) {
    // Validate the service name
    try {
      this.validateServiceName(name);
    } catch (error) {
      throw new InvalidArgumentError(`Invalid service name ${name}`, error as Error);
    }

    // Check if the service is already registered
    if (this.factories.has(name)) {
      throw new ServiceError(`Service ${name} is already registered.`);
    }

    // Ensure the service class implements the required methods
    if (
      typeof serviceClass.prototype.start !== "function" ||
      typeof serviceClass.prototype.stop !== "function"
    ) {
      throw new InvalidClassError(`${name} must implement the start() and stop() methods.`);
    }

    this.factories.set(name, serviceClass); // Store the service class
  }

  /**
   * Unregister a service by name.
   *
   * @param name - The name of the service to unregister
   * @returns `true` if the service was unregistered, `false` otherwise.
   * @throws {InvalidArgumentError} If the service name is invalid.
   * @throws {ServiceError} If the service fails to stop.
   *
   * @example
   * const result = await ServiceRegistry.unregisterService("LoggerService");
   * console.log(result); // true
   */
  static async unregisterService<T extends keyof ServicesList>(name: T): Promise<boolean> {
    // Validate the service name
    try {
      this.validateServiceName(name);
    } catch (error) {
      throw new InvalidArgumentError("Invalid service name", error as Error);
    }

    // Check if the service is registered
    if (!this.factories.has(name)) {
      console.warn(`Service '${name}' is not registered.`);
      return false;
    }

    // Remove the service from the registry
    this.factories.delete(name);

    // Stop any running instances of the service
    try {
      await this.stopService(name);
    } catch (error) {
      console.error(`Failed to stop service '${name}' during unregistration:`, error);
      throw new ServiceError(
        `Failed to stop service '${name}' during unregistration.`,
        error as Error
      );
    }

    // Remove the service from the running instances map
    this.services.delete(name);

    console.log(`Service '${name}' has been successfully unregistered.`);

    return true;
  }

  /**
   * List all instances of a service.
   *
   * @param name - Name of the service
   * @returns An array of argument lists for each instance if the service is running. Returns an empty array if the service is not running.
   * @throws {InvalidArgumentError} If the service name is invalid.
   *
   */
  static listServiceInstances(name: string): unknown[][] | [] {
    // Validate the service name
    try {
      this.validateServiceName(name);
    } catch (error) {
      throw new InvalidArgumentError("Invalid service name", error as Error);
    }

    // Retrieve the instances map for the service
    const instances = this.services.get(name);

    if (!instances) {
      console.warn(`No running instances found for service '${name}'.`);
      return [];
    }

    // Convert serialized argument keys back into arrays
    try {
      return Array.from(instances.keys()).map((argsKey) => JSON.parse(argsKey));
    } catch (error) {
      console.error(`Failed to parse instance arguments for service '${name}':`, error);
      throw new UnexpectedError(
        `Failed to retrieve instances for service '${name}'.`,
        error as Error
      );
    }
  }

  /**
   * List all running services.
   * @returns An array of all running service names.
   *
   * const runningServices = ServiceRegistry.listRunningServices();
   * console.log(runningServices); // ["LoggerService", "ExtensionService"]
   */
  static listRunningServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Starts a service. If the service is already running, returns the existing instance.
   *
   * @template T - The key of the service in the `ServicesList`.
   * @template Args - The arguments required by the service constructor.
   *
   * @param name - The name of the service to start.
   * @param args - Arguments to pass to the service constructor.
   * @returns The service instance.
   * @throws {InvalidArgumentError} If the service name is invalid.
   * @throws {ServiceError} If the service is not registered.
   * @throws {UnexpectedError} If the service fails to start.
   *
   */
  static async startService<T extends keyof ServicesList, Args extends any[] = []>(
    name: T,
    ...args: Args
  ): Promise<ServicesList[T]> {
    // Validate the service name
    try {
      this.validateServiceName(name);
    } catch (error) {
      throw new InvalidArgumentError("Invalid service name", error as Error);
    }

    // First check if the service is already running. If so, return the instance.
    const argsKey = JSON.stringify(args); // The default key will be "[]", if args to the constructor is empty.
    if (this.services.has(name) && this.services.get(name)!.has(argsKey)) {
      console.warn(`Service ${name} is already running.`);
      return this.services.get(name)!.get(argsKey);
    }

    // Retrieve the factory function
    const factory = this.factories.get(name);
    if (!factory) {
      throw new ServiceError(`Service ${name} is not registered.`);
    }

    // Create a new instance of the service
    let instance: ServicesList[T];
    try {
      instance = new factory(...args);
    } catch (error) {
      throw new UnexpectedError(
        `Failed to instantiate service '${name}' with arguments: ${JSON.stringify(args)}.`,
        error as Error
      );
    }

    // Store the service instance
    if (!this.services.has(name)) {
      this.services.set(name, new Map());
    }
    this.services.get(name)!.set(argsKey, instance);

    // If the service has a start() method, call it
    try {
      if (typeof instance.start === "function") {
        await instance.start();
      }
    } catch (error) {
      throw new UnexpectedError(`Failed to start service '${name}'.`, error as Error);
    }

    console.log(`Service '${name}' has been started successfully.`);
    return instance;
  }

  /**
   * Get a service instance. If the service is not running, starts it.
   *
   * @template T - The key of the service in the `ServicesList`.
   * @template Args - The arguments required by the service constructor.
   *
   * @param name - Name of the service.
   * @param args - Arguments to pass to the service constructor.
   * @returns The service instance.
   * @throws {InvalidArgumentError} If the service name is invalid.
   * @throws {ServiceError} If the service is not registered.
   */
  static async getService<T extends keyof ServicesList, Args extends any[] = []>(
    name: T,
    ...args: Args
  ): Promise<ServicesList[T]> {
    // Validate the service name
    try {
      this.validateServiceName(name);
    } catch (error) {
      throw new InvalidArgumentError("Invalid service name", error as Error);
    }

    // First check if the service is already running
    const argsKey = JSON.stringify(args); // The default key will be "[]", if args is empty
    if (this.services.has(name) && this.services.get(name)!.has(argsKey)) {
      console.log(`Service '${name}' is already running.`);
      return this.services.get(name)!.get(argsKey);
    }

    try {
      // If the service is not running, start it and return the instance
      return await this.startService<T, Args>(name, ...args);
    } catch (error) {
      throw new ServiceError(`Failed to start service '${name}'.`, error as Error);
    }
  }

  /**
   * Check whether a particular service is running.
   *
   * @param name - The name of the service to check.
   * @param args - Arguments to uniquely identify the service instance (optional).
   * @returns `true` if the service is running, `false` otherwise.
   * @throws {InvalidArgumentError} If the service name is invalid.
   */
  static isServiceRunning(name: string, ...args: any[]): boolean {
    // Validate the service name
    try {
      this.validateServiceName(name);
    } catch (error) {
      throw new InvalidArgumentError("Invalid service name", error as Error);
    }

    // Check if the service is running
    if (!this.services.has(name)) {
      console.log(`Service '${name}' is not registered or has no running instances.`);
      return false;
    }

    const instances = this.services.get(name);
    if (!instances) {
      console.log(`Service '${name}' has no running instances.`);
      return false;
    }

    // Convert arguments to a string key and check if the instance exists
    const argsKey = JSON.stringify(args);
    return instances.has(argsKey);
  }

  /**
   * Restarts a service.
   *
   * @template T - The key of the service in the `ServicesList`.
   * @template Args - The arguments required by the service constructor.
   *
   * @param name - The name of the service to restart.
   * @param args - Arguments to pass to the service constructor.
   * @returns The restarted service instance.
   *
   *
   * @throws {InvalidArgumentError} If the service name is invalid.
   * @throws {ServiceError} If the service is not registered.
   *
   *
   */
  static async restartService<T extends keyof ServicesList, Args extends any[] = []>(
    name: T,
    ...args: Args
  ): Promise<ServicesList[T]> {
    // Validate the service name
    try {
      this.validateServiceName(name);
    } catch (error) {
      throw new InvalidArgumentError(`Invalid service name: '${name}'.`, error as Error);
    }

    // Check if the service is registered, if not throw an error
    if (!this.factories.has(name)) {
      throw new ServiceError(`Service '${name}' is not registered.`);
    }

    // Log the restart process
    console.log(`Restarting service '${name}'...`);

    // Stop the service if it is running
    if (this.isServiceRunning(name, ...args)) {
      try {
        await this.stopService(name);
        console.log(`Service '${name}' has been stopped.`);
      } catch (error) {
        console.error(`Failed to stop service '${name}' during restart:`, error);
        console.warn(`Proceeding to restart service '${name}' despite stop failure.`);
      }
    } else {
      console.warn(`Service '${name}' is not running. Starting it directly.`);
    }

    // Start the service again
    try {
      const instance = await this.startService(name, ...args);
      console.log(`Service '${name}' has been restarted successfully.`);
      return instance;
    } catch (error) {
      throw new UnexpectedError(`Failed to restart service '${name}'.`, error as Error);
    }
  }

  /**
   * Stops a specific service by name.
   *
   * @param name - The name of the service to stop.
   * An object containing the number of successfully stopped instances and the arguments of instances that failed to stop.
   *
   * @throws {InvalidArgumentError} If the service name is invalid.
   * @throws {ServiceError} If the service is not registered.
   *
   */
  static async stopService(name: string): Promise<{ stopped: number; failed: string[] }> {
    // Validate the service name
    try {
      this.validateServiceName(name);
    } catch (error) {
      throw new Error("Invalid service name: " + error);
    }

    // Check if the service is registered
    if (!this.factories.has(name)) {
      throw new ServiceError(`Service ${name} is not registered.`);
    }

    // Check if the service is running
    const instances = this.services.get(name);
    if (!instances) {
      console.warn(`Service ${name} is not running.`);
      return { stopped: 0, failed: [] };
    }

    const failedInstances: string[] = [];
    let stoppedCount = 0;

    // Calling the stop() method on each instance
    for (const [argsKey, instance] of instances) {
      try {
        if (typeof instance.stop === "function") {
          await instance.stop();
          console.log(`Stopped instance of '${name}' with arguments: ${argsKey}`);
          stoppedCount++;
        }
      } catch (error) {
        console.error(`Failed to stop instance of '${name}' with arguments: ${argsKey}`, error);
        failedInstances.push(argsKey);
      }
    }

    // Clear all instances of the service
    this.services.delete(name);

    console.log(`Service ${name} has been shut down.`);
    return { stopped: stoppedCount, failed: failedInstances };
  }

  /**
   * Stops all running services
   * @returns An object containing the number of successfully stopped services and the names of services that failed to stop.
   *
   * @todo Use Promises.all for parallel execution to improve performance.
   *
   * @example
   * // Stop all services
   * const result = await ServiceRegistry.stopAllService();
   * console.log(result); // { stopped: 3, failed: ["LoggerService"] }
   */
  static async stopAllService(): Promise<{ stopped: number; failed: string[] }> {
    const serviceNames = Array.from(this.services.keys());
    const failedServices: string[] = [];
    let stoppedCount = 0;

    for (const name of serviceNames) {
      try {
        const result = await this.stopService(name);
        if (result.failed.length > 0) {
          console.warn(`Some instances of service '${name}' failed to stop:`, result.failed);
          failedServices.push(name);
        }
        stoppedCount += result.stopped;
      } catch (error) {
        console.error(`Failed to stop service '${name}':`, error);
        failedServices.push(name);
      }
    }

    // Clear the registry
    this.services.clear();

    console.log(
      `All services have been processed. Successfully stopped: ${stoppedCount}, Failed: ${failedServices.length}`
    );

    return { stopped: stoppedCount, failed: failedServices };
  }

  /**
   * Validates a service name to ensure it meets the required criteria.
   *
   * @param name - The name of the service to validate.
   * @throws {ValidationError} if the service name is invalid.
   */
  private static validateServiceName(name: any): void {
    // Check for null or undefined
    if (name == null || name == undefined) {
      throw new ValidationError("Service name cannot be null or undefined.");
    }

    // Check for non-string types
    if (typeof name !== "string") {
      throw new ValidationError("Service name must be a string.");
    }

    // Trim whitespace to handle cases like "   " or empty strings
    const trimmedName = name.trim();

    // Check for empty string after trimming
    if (trimmedName.length === 0) {
      throw new ValidationError("Service name cannot be an empty string.");
    }

    // Check for only whitespace characters
    if (!/\S/.test(name)) {
      throw new ValidationError("Service name cannot contain only whitespace characters.");
    }

    // Check for excessively long names (you can adjust the length limit as needed)
    const maxLength = 255;
    if (trimmedName.length > maxLength) {
      throw new ValidationError(
        `Service name is too long. Maximum allowed length is ${maxLength} characters.`
      );
    }

    // Check for excessively short names
    const minLength = 1;
    if (trimmedName.length < minLength) {
      throw new ValidationError(
        `Service name is too short. Minimum allowed length is ${minLength} characters.`
      );
    }

    // Check for invalid characters (only allow alphanumeric, hyphens, and underscores)
    const invalidCharacters = /[^a-zA-Z0-9-_]/;
    if (invalidCharacters.test(trimmedName)) {
      throw new ValidationError(
        `Service name "${name}" contains invalid characters. Only alphanumeric characters, hyphens, and underscores are allowed.`
      );
    }

    // Disallow purely numeric names to avoid confusion with IDs
    if (/^\d+$/.test(trimmedName)) {
      throw new ValidationError("Service name cannot be purely numeric.");
    }

    // Disallow leading or trailing hyphens/underscores
    if (/^[-_]|[-_]$/.test(trimmedName)) {
      throw new ValidationError("Service name cannot start or end with a hyphen or underscore.");
    }

    // Disallow consecutive hyphens or underscores
    if (/[-_]{2,}/.test(trimmedName)) {
      throw new ValidationError("Service name cannot contain consecutive hyphens or underscores.");
    }
  }

  /**
   * Clears all services from the registry.
   *
   * This method is intended for testing purposes only.
   */
  static clearAll() {
    this.services.clear();
    this.factories.clear();
  }
}
