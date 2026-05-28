// src/lib/events.ts
import { EventEmitter } from "events";

class GlobalEventEmitter extends EventEmitter {
  private static instance: GlobalEventEmitter;

  public static getInstance(): GlobalEventEmitter {
    if (!GlobalEventEmitter.instance) {
      GlobalEventEmitter.instance = new GlobalEventEmitter();
      // Increase max listeners for multiple connected SSE clients
      GlobalEventEmitter.instance.setMaxListeners(100);
    }
    return GlobalEventEmitter.instance;
  }
}

export const eventEmitter = GlobalEventEmitter.getInstance();
