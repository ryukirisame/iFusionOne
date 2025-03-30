import { ServiceRegistry } from "../../registry/ServiceRegistry/ServiceRegistry.js";
import Service from "../Service.js";
import ExtensionManager from "./ExtensionManager.js";

export default class ExtensionService implements Service {
  private ExtensionServiceImpl: ExtensionManager;

  constructor() {
    this.ExtensionServiceImpl = ExtensionManager.getInstance();
  }

  start() {
    console.log("Extension Service started");
  }
  stop() {
    console.log("Extension Service stopped");
  }

  installExtension() {
    console.log("Installing Extension");
  }

  uninstallExtension() {
    console.log("Uninstalling Extension");
  }

  loadExtension() {
    console.log("Loading Extension");
  }

  listExtension() {
    console.log("Listing Extension");
  }

  updateExtension() {
    console.log("Updating Extension");
  }

  enableExtension() {
    console.log("Enabling Extension");
  }

  disableExtension() {
    console.log("Disabling Extension");
  }
}

// Registering ExtensionService to ServiceRegistry
ServiceRegistry.registerService("ExtensionService", ExtensionService);
