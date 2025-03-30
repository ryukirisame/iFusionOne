import { ExtensionService } from "../../src/electron/core/services/services.ts";

export {};

declare global {
  // Acts as the source of truth for all available services
  // Maps service names to their constructors
  type ServicesList = {
    ExtensionService: ExtensionService;

    // Add more services here
  };
}

