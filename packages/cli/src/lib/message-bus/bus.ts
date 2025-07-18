import { type PluginEvent, type PluginEventPayload } from "$plugins/plugin";
import { Channel } from "./channel";

export class MessageBus {
  private channels: Channel[] = [];

  channel(): Channel {
    const channel = new Channel();
    this.channels.push(channel);
    return channel;
  }

  publish<T extends PluginEventPayload<PluginEvent>>(payload: T): void {
    this.channels.forEach((channel) => {
      channel.publish(payload);
    });
  }

  public static from(): MessageBus {
    return new MessageBus();
  }
}
