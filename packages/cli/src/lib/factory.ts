import { PluginManager } from "$plugins/manager";
import { Config } from "./config/config";
import { MessageBus } from "./message-bus/bus";

export class Factory {
  bus: MessageBus;
  plugins: PluginManager;

  constructor(config: Config) {
    this.bus = MessageBus.from();
    this.plugins = new PluginManager();
    for (const plugin of config.plugins) {
      this.plugins.register(plugin, this.bus.channel());
    }
  }

  static fromConfig(config: Config) {
    return new Factory(config);
  }
}
