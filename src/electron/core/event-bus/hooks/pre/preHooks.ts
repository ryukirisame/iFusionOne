import EventBus from "../../EventBus.js";

// Logging pre-middleware events.
EventBus.usePre((event, data) => {
  console.log(`[PRE] Event: ${event}`, data);
});

