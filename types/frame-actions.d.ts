declare global {
  // Frame Window
  type FrameWindowAction = "CLOSE" | "MAXIMIZE" | "MINIMIZE";

  

  // Event-Payload mapping for frame-actions
  interface EventPayloadMapping {
    sendFrameAction: {
      request: FrameWindowAction;
      response: void;
    };
  }

  // Exposing APIs to ifusion under frameActions object
  interface ifusion {
    frameActions: {
      sendFrameAction: (payload: FrameWindowAction) => void;
    };
  }
}

export {};
