import fs from "node:fs";
import path from "path";

export namespace snapshots {
  export const latest = (name: string, data: any): string => {
    const p = path.join(process.cwd(), "..", "test", "snapshots", "operators", name);
    const relativePath = path.relative(process.cwd(), p);
    fs.mkdirSync(p, { recursive: true });
    fs.writeFileSync(path.join(p, "latest.json"), JSON.stringify(data, null, 2));
    return relativePath;
  };

  export const archive = (name: string, data: any): string => {
    const p = path.relative(
      process.cwd(),
      path.join(process.cwd(), "..", "test", "snapshots", "operators", name, "archives")
    );
    fs.mkdirSync(p, { recursive: true });
    fs.writeFileSync(
      path.join(p, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`),
      JSON.stringify(data, null, 2)
    );
    return p;
  };
}
