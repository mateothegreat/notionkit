import { PluginEvent, type Plugin, type PluginEventPayload } from "$plugins/plugin";
import { randomUUID } from "node:crypto";

export type ChannelPublish = {
  consumers: number;
};

export class Channel {
  private readonly plugins: Map<string, Plugin> = new Map();
  private readonly consumers: Map<PluginEvent, Set<string>> = new Map();

  public subscribe(plugin: Plugin): void {
    const id = randomUUID();
    this.plugins.set(id, plugin);
    for (const event of plugin.events) {
      if (!this.consumers.has(event)) {
        this.consumers.set(event, new Set());
      }
      this.consumers.get(event)!.add(id);
    }
  }

  public unsubscribe(id: string): void {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      return;
    }

    for (const event of plugin.events) {
      this.consumers.get(event)?.delete(id);
    }
    this.plugins.delete(id);
  }

  public publish<T extends PluginEventPayload<PluginEvent>>(payload: T): ChannelPublish {
    const subscriberIds = this.consumers.get(payload.event);
    if (!subscriberIds) {
      return { consumers: 0 };
    }

    for (const id of subscriberIds) {
      const subscriber = this.plugins.get(id);
      subscriber?.handler(payload.event, payload.data);
    }
    return { consumers: subscriberIds.size };
  }
}
