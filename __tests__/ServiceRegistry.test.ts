import { ServiceRegistry } from "../src/electron/core/registry/ServiceRegistry/ServiceRegistry"; // Adjust the path accordingly

// Mock service for testing
import Service from "../src/electron/core/services/Service";




// Mock Service classes
class TestService extends Service {
  start() {
    console.log("TestService started");
  }
  stop() {
    console.log("TestService stopped");
  }
}

class AnotherService extends Service {
  start() {
    console.log("AnotherService started");
  }
  stop() {
    console.log("AnotherService stopped");
  }
}

class ServiceWithArgs extends Service {
  private arg: string;
  constructor(arg: string) {
    super();
    this.arg = arg;
  }
  start() {
    console.log(`ServiceWithArgs started with arg: ${this.arg}`);
  }
  stop() {
    console.log(`ServiceWithArgs stopped`);
  }
}

describe("ServiceRegistry", () => {
  beforeEach(() => {
    ServiceRegistry.clearAll();
  });

  afterAll(() => {
    ServiceRegistry.stopAllService();
  });

  test("should not list duplicate service names when running multiple instances", () => {
    ServiceRegistry.registerService("MultiService", ServiceWithArgs);
    ServiceRegistry.startService("MultiService", "Instance1");
    ServiceRegistry.startService("MultiService", "Instance2");
  
    const runningServices = ServiceRegistry.listRunningServices();
    expect(runningServices).toEqual(["MultiService"]);
  });

  test("should list the service correctly after unregistering and re-registering", () => {
    ServiceRegistry.registerService("ReRegisterService", TestService);
    ServiceRegistry.startService("ReRegisterService");
    ServiceRegistry.unregisterService("ReRegisterService");
  
    // Re-register and start again
    ServiceRegistry.registerService("ReRegisterService", AnotherService);
    ServiceRegistry.startService("ReRegisterService");
  
    const runningServices = ServiceRegistry.listRunningServices();
    expect(runningServices).toContain("ReRegisterService");
    expect(runningServices.length).toBe(1);
  });

  test("should list services correctly after rapid start-stop cycles", () => {
    ServiceRegistry.registerService("RapidService", TestService);
  
    for (let i = 0; i < 10; i++) {
      ServiceRegistry.startService("RapidService");
      ServiceRegistry.stopService("RapidService");
    }
  
    // Ensure no residual running services after rapid operations
    const runningServices = ServiceRegistry.listRunningServices();
    expect(runningServices).toEqual([]);
  });

  
  test("should throw an error when attempting to restart an unregistered service", () => {
    ServiceRegistry.registerService("RestartTestService", TestService);
    ServiceRegistry.startService("RestartTestService");
    ServiceRegistry.unregisterService("RestartTestService");
  
    expect(() => ServiceRegistry.restartService("RestartTestService")).toThrow(
      "Service RestartTestService is not registered."
    );
  
    const runningServices = ServiceRegistry.listRunningServices();
    expect(runningServices).toEqual([]);
  });
  
  test("should list only running services when some services are stopped", () => {
    ServiceRegistry.registerService("Service1", TestService);
    ServiceRegistry.registerService("Service2", AnotherService);
    ServiceRegistry.registerService("Service3", ServiceWithArgs);
  
    ServiceRegistry.startService("Service1");
    ServiceRegistry.startService("Service2");
    ServiceRegistry.startService("Service3", "arg");
  
    // Stop one service
    ServiceRegistry.stopService("Service2");
  
    const runningServices = ServiceRegistry.listRunningServices();
    expect(runningServices).toContain("Service1");
    expect(runningServices).toContain("Service3");
    expect(runningServices).not.toContain("Service2");
    expect(runningServices.length).toBe(2);
  });
  
  test("should list no running services after manually clearing all services", () => {
    ServiceRegistry.registerService("ServiceA", TestService);
    ServiceRegistry.registerService("ServiceB", AnotherService);
  
    ServiceRegistry.startService("ServiceA");
    ServiceRegistry.startService("ServiceB");
  
    // Clear all services manually
    ServiceRegistry.clearAll();
  
    const runningServices = ServiceRegistry.listRunningServices();
    expect(runningServices).toEqual([]);
  });
  

  test("should register and start a service successfully", () => {
    ServiceRegistry.registerService("TestService", TestService);
    const instance = ServiceRegistry.getService("TestService");
    expect(instance).toBeInstanceOf(TestService);
  });

  test("should not allow registering a service without a name", () => {
    expect(() => ServiceRegistry.registerService("", TestService)).toThrow("Invalid service name: Error: Service name cannot be an empty string.");
  });

  test("should throw error when registering the same service again", () => {
    ServiceRegistry.registerService("TestService", TestService);
    expect(() => ServiceRegistry.registerService("TestService", TestService)).toThrow("Service TestService is already registered.");
  });

  test("should throw error if service does not implement start() and stop() methods", () => {
    class InvalidService {}
    expect(() => ServiceRegistry.registerService("InvalidService", InvalidService as any)).toThrow(
      "Service InvalidService must implement the start() and stop() methods."
    );
  });

  test("should start and stop services correctly", () => {
    ServiceRegistry.registerService("AnotherService", AnotherService);
    const instance = ServiceRegistry.startService("AnotherService");
    expect(instance).toBeInstanceOf(AnotherService);

    const isRunning = ServiceRegistry.isServiceRunning("AnotherService");
    expect(isRunning).toBe(true);

    const stopped = ServiceRegistry.stopService("AnotherService");
    expect(stopped).toBe(true);
    expect(ServiceRegistry.isServiceRunning("AnotherService")).toBe(false);
  });

  test("should restart a running service", () => {
    ServiceRegistry.registerService("TestService", TestService);
    ServiceRegistry.startService("TestService");
    const restartedInstance = ServiceRegistry.restartService("TestService");
    expect(restartedInstance).toBeInstanceOf(TestService);
    expect(ServiceRegistry.isServiceRunning("TestService")).toBe(true);
  });

  test("should throw error when restarting a non-running service", () => {
    ServiceRegistry.registerService("TestService", TestService);
    expect(() => ServiceRegistry.restartService("TestService")).toThrow("Service TestService is not running.");
  });

  test("should unregister a service", () => {
    ServiceRegistry.registerService("AnotherService", AnotherService);
    const unregistered = ServiceRegistry.unregisterService("AnotherService");
    expect(unregistered).toBe(true);
    expect(ServiceRegistry.isServiceRunning("AnotherService")).toBe(false);
  });

  test("should return false when unregistering a non-existent service", () => {
    const unregistered = ServiceRegistry.unregisterService("NonExistentService");
    expect(unregistered).toBe(false);
  });

  test("should list all running services", () => {
    ServiceRegistry.registerService("TestService", TestService);
    ServiceRegistry.registerService("AnotherService", AnotherService);

    ServiceRegistry.startService("TestService");
    ServiceRegistry.startService("AnotherService");

    const runningServices = ServiceRegistry.listRunningServices();
    expect(runningServices).toContain("TestService");
    expect(runningServices).toContain("AnotherService");
  });

  test("should list all instances of a service", () => {
    ServiceRegistry.registerService("ServiceWithArgs", ServiceWithArgs);
    ServiceRegistry.startService("ServiceWithArgs", "arg1");
    ServiceRegistry.startService("ServiceWithArgs", "arg2");

    const instances = ServiceRegistry.listServiceInstances("ServiceWithArgs");
    expect(instances).toEqual([["arg1"], ["arg2"]]);
  });

  test("should stop all services", () => {
    ServiceRegistry.registerService("TestService", TestService);
    ServiceRegistry.registerService("AnotherService", AnotherService);

    ServiceRegistry.startService("TestService");
    ServiceRegistry.startService("AnotherService");

    ServiceRegistry.stopAllService();

    expect(ServiceRegistry.listRunningServices()).toEqual([]);
  });

  test("should return false when stopping a non-existent service", () => {
    const stopped = ServiceRegistry.stopService("NonExistentService");
    expect(stopped).toBe(false);
  });

  test("should not start a service twice with the same arguments", () => {
    ServiceRegistry.registerService("ServiceWithArgs", ServiceWithArgs);
    const instance1 = ServiceRegistry.startService("ServiceWithArgs", "arg1");
    const instance2 = ServiceRegistry.startService("ServiceWithArgs", "arg1");

    expect(instance1).toBe(instance2); // Same instance should be returned
  });

  test("should throw an error if trying to get an unregistered service", () => {
    expect(() => ServiceRegistry.getService("UnknownService")).toThrow("Service UnknownService is not registered.");
  });

  test("should clear all registered services", () => {
    ServiceRegistry.registerService("TestService", TestService);
    ServiceRegistry.registerService("AnotherService", AnotherService);

    ServiceRegistry.clearAll();

    expect(ServiceRegistry.listRunningServices()).toEqual([]);
    expect(ServiceRegistry.listServiceInstances("TestService")).toEqual([]);
    expect(ServiceRegistry.listServiceInstances("AnotherService")).toEqual([]);
  });
});






describe("ServiceRegistry - Rigorous Tests", () => {
    beforeEach(() => {
      ServiceRegistry.clearAll();
    });
  
    afterAll(() => {
      ServiceRegistry.stopAllService();
    });
  
    // Test: Concurrent registration of multiple services
    test("should handle concurrent registration of multiple services", () => {
      const serviceCount = 100;
  
      for (let i = 0; i < serviceCount; i++) {
        ServiceRegistry.registerService(`Service${i}`, TestService);
        ServiceRegistry.startService(`Service${i}`)
      }
  
      const registeredServices = ServiceRegistry.listRunningServices() ;
      expect(registeredServices.length).toBe(serviceCount);
    });
  
    // Test: Concurrent starting and stopping of services
    test("should handle concurrent start and stop of multiple services", async () => {
      const serviceCount = 50;
      const startPromises: Promise<any>[] = [];
      const stopPromises: Promise<any>[] = [];
  
      for (let i = 0; i < serviceCount; i++) {
        ServiceRegistry.registerService(`Service${i}`, TestService);
        startPromises.push(Promise.resolve(ServiceRegistry.startService(`Service${i}`)));
      }
  
      await Promise.all(startPromises);
      expect(ServiceRegistry.listRunningServices().length).toBe(serviceCount);
  
      for (let i = 0; i < serviceCount; i++) {
        stopPromises.push(Promise.resolve(ServiceRegistry.stopService(`Service${i}`)));
      }
  
      await Promise.all(stopPromises);
      expect(ServiceRegistry.listRunningServices().length).toBe(0);
    });
  
    // Test: Handling service that throws error on start
    class FaultyService extends Service {
      start() {
        throw new Error("Service failed to start");
      }
      stop() {
        console.log("FaultyService stopped");
      }
    }
  
    
  
    // Test: Handling service that throws error on stop
    class UnstoppableService extends Service {
      start() {
        console.log("UnstoppableService started");
      }
      stop() {
        throw new Error("Service failed to stop");
      }
    }
  
    test("should handle service that throws an error on stop", () => {
      ServiceRegistry.registerService("UnstoppableService", UnstoppableService);
      ServiceRegistry.startService("UnstoppableService");
  
      expect(() => ServiceRegistry.stopService("UnstoppableService")).toThrow(
        "Service failed to stop"
      );
      expect(ServiceRegistry.isServiceRunning("UnstoppableService")).toBe(true);
    });
  
    // Test: Performance for a large number of services
    test("should handle registering and starting a large number of services efficiently", () => {
      const serviceCount = 1000;
  
      for (let i = 0; i < serviceCount; i++) {
        ServiceRegistry.registerService(`BigService${i}`, TestService);
        ServiceRegistry.startService(`BigService${i}`);
      }
  
      expect(ServiceRegistry.listRunningServices().length).toBe(serviceCount);
    });
  
    
  
    // Test: Unregister a running service
    test("should unregister a running service and stop it", () => {
      ServiceRegistry.registerService("RunningService", TestService);
      ServiceRegistry.startService("RunningService");
  
      const unregistered = ServiceRegistry.unregisterService("RunningService");
      expect(unregistered).toBe(true);
      expect(ServiceRegistry.isServiceRunning("RunningService")).toBe(false);
    });
  
    
  
    // Test: Service replacement after unregistration
    test("should register a new service with the same name after unregistering", () => {
      ServiceRegistry.registerService("ReplaceService", TestService);
      ServiceRegistry.unregisterService("ReplaceService");
  
      ServiceRegistry.registerService("ReplaceService", AnotherService);
      const instance = ServiceRegistry.startService("ReplaceService");
      expect(instance).toBeInstanceOf(AnotherService);
    });
  
    // Test: Dependency Handling
    test("should handle dependent services correctly", () => {
      class DependentService extends Service {
        start() {
          if (!ServiceRegistry.isServiceRunning("BaseService")) {
            throw new Error("BaseService is required");
          }
          console.log("DependentService started");
        }
        stop() {
          console.log("DependentService stopped");
        }
      }
  
      ServiceRegistry.registerService("BaseService", TestService);
      ServiceRegistry.registerService("DependentService", DependentService);
  
      expect(() => ServiceRegistry.startService("DependentService")).toThrow(
        "BaseService is required"
      );
  
      ServiceRegistry.startService("BaseService");
      const instance = ServiceRegistry.startService("DependentService");
      expect(instance).toBeInstanceOf(DependentService);
    });
  });
  




  describe("ServiceRegistry - listRunningServices", () => {
    beforeEach(() => {
      ServiceRegistry.clearAll();
    });
  
    afterAll(() => {
      ServiceRegistry.stopAllService();
    });
  
    test("should return an empty array when no services are running", () => {
      const runningServices = ServiceRegistry.listRunningServices();
      expect(runningServices).toEqual([]);
    });
  
    test("should list a single running service correctly", () => {
      ServiceRegistry.registerService("TestService", TestService);
      ServiceRegistry.startService("TestService");
  
      const runningServices = ServiceRegistry.listRunningServices();
      expect(runningServices).toContain("TestService");
      expect(runningServices.length).toBe(1);
    });
  
    test("should list multiple running services correctly", () => {
      ServiceRegistry.registerService("ServiceA", TestService);
      ServiceRegistry.registerService("ServiceB", AnotherService);
      ServiceRegistry.startService("ServiceA");
      ServiceRegistry.startService("ServiceB");
  
      const runningServices = ServiceRegistry.listRunningServices();
      expect(runningServices).toContain("ServiceA");
      expect(runningServices).toContain("ServiceB");
      expect(runningServices.length).toBe(2);
    });
  
    test("should not list stopped services", () => {
      ServiceRegistry.registerService("ServiceA", TestService);
      ServiceRegistry.registerService("ServiceB", AnotherService);
      ServiceRegistry.startService("ServiceA");
      ServiceRegistry.startService("ServiceB");
  
      // Stop one service
      ServiceRegistry.stopService("ServiceA");
  
      const runningServices = ServiceRegistry.listRunningServices();
      expect(runningServices).not.toContain("ServiceA");
      expect(runningServices).toContain("ServiceB");
      expect(runningServices.length).toBe(1);
    });
  
    test("should list services correctly after stopping and restarting", () => {
      ServiceRegistry.registerService("ServiceA", TestService);
      ServiceRegistry.startService("ServiceA");
  
      // Stop and restart the service
      ServiceRegistry.stopService("ServiceA");
      ServiceRegistry.startService("ServiceA");
  
      const runningServices = ServiceRegistry.listRunningServices();
      expect(runningServices).toContain("ServiceA");
      expect(runningServices.length).toBe(1);
    });
  
    test("should list no running services after stopping all", () => {
      ServiceRegistry.registerService("ServiceA", TestService);
      ServiceRegistry.registerService("ServiceB", AnotherService);
      ServiceRegistry.startService("ServiceA");
      ServiceRegistry.startService("ServiceB");
  
      // Stop all services
      ServiceRegistry.stopAllService();
  
      const runningServices = ServiceRegistry.listRunningServices();
      expect(runningServices).toEqual([]);
    });
  
    test("should list services correctly after unregistering a running service", () => {
      ServiceRegistry.registerService("ServiceA", TestService);
      ServiceRegistry.startService("ServiceA");
  
      // Unregister the running service
      ServiceRegistry.unregisterService("ServiceA");
  
      const runningServices = ServiceRegistry.listRunningServices();
      expect(runningServices).not.toContain("ServiceA");
      expect(runningServices.length).toBe(0);
    });
  });
  






  
  describe("ServiceRegistry - Service Name Validation", () => {
    beforeEach(() => {
      ServiceRegistry.clearAll();
    });
  
    afterAll(() => {
      ServiceRegistry.stopAllService();
    });
  
    const invalidNames = [
      "", // Empty string
      null, // Null value
      undefined, // Undefined value
      12345, // Non-string value
      "@Invalid!Name$", // Special characters
      "a".repeat(300), // Excessively long name
    ];
  
    test.each(invalidNames)(
      "should throw an error when registering a service with an invalid name: %p",
      (invalidName) => {
        expect(() => ServiceRegistry.registerService(invalidName as any, TestService)).toThrow(
          "Invalid service name"
        );
      }
    );
  
    test.each(invalidNames)(
      "should throw an error when starting a service with an invalid name: %p",
      (invalidName) => {
        expect(() => ServiceRegistry.startService(invalidName as any)).toThrow("Invalid service name");
      }
    );
  
    test.each(invalidNames)(
      "should throw an error when stopping a service with an invalid name: %p",
      (invalidName) => {
        expect(() => ServiceRegistry.stopService(invalidName as any)).toThrow("Invalid service name");
      }
    );
  
    test.each(invalidNames)(
      "should throw an error when restarting a service with an invalid name: %p",
      (invalidName) => {
        expect(() => ServiceRegistry.restartService(invalidName as any)).toThrow("Invalid service name");
      }
    );
  
    test.each(invalidNames)(
      "should throw an error when unregistering a service with an invalid name: %p",
      (invalidName) => {
        expect(() => ServiceRegistry.unregisterService(invalidName as any)).toThrow("Invalid service name");
      }
    );
  
    test.each(invalidNames)(
      "should throw an error when getting a service with an invalid name: %p",
      (invalidName) => {
        expect(() => ServiceRegistry.getService(invalidName as any)).toThrow("Invalid service name");
      }
    );
  
    test.each(invalidNames)(
      "should throw an error when listing instances of a service with an invalid name: %p",
      (invalidName) => {
        expect(() => ServiceRegistry.listServiceInstances(invalidName as any)).toThrow(
          "Invalid service name"
        );
      }
    );
  });