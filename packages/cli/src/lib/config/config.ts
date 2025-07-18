import type { PluginInit } from "$plugins/bundled";

export class Config {
  token: string;
  workspace: string;
  outputDir: string;
  parallelLimit: number;
  maxRetries: number;
  retryDelay: number;
  debug: boolean;
  plugins: PluginInit[];

  constructor(config: Config) {
    this.token = config.token;
    this.workspace = config.workspace;
    this.outputDir = config.outputDir;
    this.parallelLimit = config.parallelLimit;
    this.maxRetries = config.maxRetries;
    this.retryDelay = config.retryDelay;
    this.debug = config.debug;
    this.plugins = config.plugins;
  }
}
