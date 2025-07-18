import type { Channel } from "$lib/message-bus/channel";
import { log } from "$lib/util/logging";
import { BundledPluginMap, type PluginInit } from "./bundled";
import { type Plugin, PluginEvent, type PluginEventPayload } from "./plugin";

/**
 * Plugin manager that coordinates plugin execution.
 *
 * This is the single source of truth for managing plugin instances and their lifecycle.
 */
export class PluginManager {
  #plugins: Set<Plugin> = new Set();

  /**
   * Add a plugin instance to the manager.
   *
   * @param plugin - Plugin instance to add
   */
  register(plugin: PluginInit, channel: Channel): void {
    const p = new BundledPluginMap[plugin.id as keyof typeof BundledPluginMap]();
    this.#plugins.add(p);
    channel.subscribe(p);
    channel.publish({ event: PluginEvent.START, data: { message: `plugin ${plugin.id} ready` } });
  }

  /**
   * Dispatch an event to applicable plugins.
   *
   * @param {PluginEvent} event - Event to dispatch
   * @param {PluginEventPayload<PluginEvent>} payload - Payload to dispatch
   *
   * @returns {void} - Returns nothing.
   */
  dispatch(event: PluginEvent, payload: PluginEventPayload<PluginEvent>): void {
    this.byEvent(event).forEach((plugin) => {
      if (typeof plugin.handler === "function") {
        plugin.handler(event, payload.data);
      } else if (typeof plugin.handler === "object") {
        // plugin.handler.next(payload);
      } else {
        log.error("pluginmanager:dispatch: plugin handler is not a function or subject", { plugin, event, payload });
      }
    });
  }

  /**
   * Cleanup all plugins.
   *
   * @returns {void} - Returns nothing.
   */
  cleanup(): void {
    this.#plugins.forEach((plugin) => {
      if (typeof plugin.handler === "function") {
        plugin.handler(PluginEvent.SHUTDOWN, {});
      } else if (typeof plugin.handler === "object") {
        // plugin.handler.next({ event: PluginEvent.SHUTDOWN, data: {} });
      } else {
        log.error("pluginmanager:cleanup: plugin handler is not a function or subject", { plugin, event });
      }
    });
  }

  byEvent(event: PluginEvent): Plugin[] {
    return Array.from(this.#plugins).filter((plugin) => plugin.events.includes(event));
  }

  /**
   * Return all plugins for a given event or all events if no event is provided.
   *
   * @param {PluginEvent} event - Event to return plugins for. @optional
   *
   * @returns {Plugin[]} - Array of plugin instances
   */
  all(event?: PluginEvent): Plugin[] {
    return event ? this.byEvent(event) : Array.from(this.#plugins);
  }
}
