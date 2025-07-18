import { FileSystemPlugin } from "./bundled/filesystem";

export class PluginFromFlag {
  id: string;
  args: string[];
  path: string;

  constructor(id: string, path: string, args: string[]) {
    this.id = id;
    this.path = path;
    this.args = args;
    console.log("PluginFromFlag", this);
  }

  static fromFlag(flag: string, path: string, args: string[]): PluginInit {
    return {
      id: flag,
      path,
      args
    };
  }
}

export const BundledPluginMap = {
  filesystem: FileSystemPlugin
};

export interface PluginInit {
  id: string;
  args: string[];
  path: string;
}
