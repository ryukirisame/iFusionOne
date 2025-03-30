import { ExtensionService } from "../../../services/services.ts";

export {};

declare global{
 
    // Acts as the source of truth for all available services
    type ServicesList = {
        ExtensionService: ExtensionService;

        // Add more services here
    }
    
}