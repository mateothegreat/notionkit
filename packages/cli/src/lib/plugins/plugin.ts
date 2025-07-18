import type { Channel } from "$lib/message-bus/channel";
import { type Subject } from "rxjs";

export enum PluginEvent {
  START = "start",
  PROGRESS = "progress",
  DATA = "data",
  COMPLETE = "complete",
  SHUTDOWN = "shutdown",
  ERROR = "error"
}

export type PluginEventStart = {
  event: PluginEvent.START;
  data: {
    message: string;
  };
};

export type PluginEventProgress = {
  event: PluginEvent.PROGRESS;
  data: {
    complete: number;
    total: number;
  };
};

export type PluginEventData = {
  event: PluginEvent.DATA;
  data: {
    entity: unknown;
  };
};

export type PluginEventComplete = {
  event: PluginEvent.COMPLETE;
  data: {
    summary: unknown;
  };
};

export type PluginEventShutdown = {
  event: PluginEvent.SHUTDOWN;
  data: Record<string, never>;
};

export type PluginEventError = {
  event: PluginEvent.ERROR;
  data: {
    error: Error;
  };
};

export type PluginEventPayload<T extends PluginEvent> = T extends PluginEvent.START
  ? PluginEventStart
  : T extends PluginEvent.PROGRESS
    ? PluginEventProgress
    : T extends PluginEvent.DATA
      ? PluginEventData
      : T extends PluginEvent.COMPLETE
        ? PluginEventComplete
        : T extends PluginEvent.SHUTDOWN
          ? PluginEventShutdown
          : T extends PluginEvent.ERROR
            ? PluginEventError
            : never;

export type PluginHandler<T extends PluginEvent> =
  | Subject<PluginEventPayload<T>>
  | ((event: T, data: PluginEventPayload<T>["data"]) => void);

/**
 * Export plugin interface required for any plugin to be used with the export command.
 *
 * Plugins can handle different stages of the export process.
 *
 * @param {string} id - The id of the plugin.
 * @param {PluginEvent[]} events - The events that the plugin will handle.
 * @param on.event - Event that the plugin is receiving the payload for.
 * @param on.data - Payload for the event.
 *
 * @example
 */
export interface Plugin {
  id: string;
  events: PluginEvent[];
  channel: Channel;

  handler(event: PluginEvent, data: PluginEventPayload<PluginEvent>["data"]): void;
}
