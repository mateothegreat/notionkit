# Plugin System Documentation

## Overview

The NotionKit plugin system provides a robust, extensible architecture for processing Notion export data. It uses an event-driven pattern with RxJS observables to handle different stages of the export process.

## Architecture

### Core Components

1. **ExportPlugin Interface**: Defines the contract that all plugins must implement
2. **ExportPluginManager**: Manages plugin lifecycle and event routing
3. **Plugin Registry**: Global registry for managing available plugins
4. **FSPlugin**: Built-in filesystem plugin for exporting data to files

### Plugin Interface

```typescript
interface ExportPlugin {
  onExportStart(config: ExporterConfig): Observable<void>;
  onEntity(entity: NotionEntity): Observable<void>;
  onExportComplete(summary: ExportSummary): Observable<void>;
  onError(error: Error): Observable<void>;
  cleanup(): Promise<void>;
}
```

### Event Types

The plugin system handles the following event types:

- **start**: Emitted when export begins
- **entity**: Emitted for each Notion entity processed
- **error**: Emitted when an error occurs
- **complete**: Emitted when export finishes
- **progress**: Emitted to track progress (not handled by plugins directly)

## Usage

### Basic Plugin Creation

```typescript
import { ExportPlugin } from "@mateothegreat/notion-sync";
import { Observable, of } from "rxjs";

class MyCustomPlugin implements ExportPlugin {
  onExportStart(config: ExporterConfig): Observable<void> {
    console.log("Export started with config:", config);
    return of(undefined);
  }

  onEntity(entity: NotionEntity): Observable<void> {
    console.log("Processing entity:", entity.id, entity.type);
    // Process the entity here
    return of(undefined);
  }

  onExportComplete(summary: ExportSummary): Observable<void> {
    console.log("Export completed:", summary);
    return of(undefined);
  }

  onError(error: Error): Observable<void> {
    console.error("Export error:", error);
    return of(undefined);
  }

  async cleanup(): Promise<void> {
    console.log("Cleaning up plugin resources");
  }
}
```

### Plugin Registration

```typescript
import { registerPlugin, initPluginSystem } from "@mateothegreat/notion-sync";

// Initialize the plugin system
initPluginSystem([]);

// Register a plugin instance
const myPlugin = new MyCustomPlugin();
registerPlugin(myPlugin);

// Or register by class
import { getAllPlugins } from "@mateothegreat/notion-sync";
const registry = getAllPlugins();
registry.set("my-plugin", MyCustomPlugin);
```

### Using Plugins with ExportPluginManager

```typescript
import { ExportPluginManager, FSPlugin } from "@mateothegreat/notion-sync";

// Create plugin manager with plugin classes
const pluginManager = new ExportPluginManager([
  FSPlugin,
  MyCustomPlugin
]);

// Notify plugins of events
pluginManager.notify({ type: "start", config });
pluginManager.notify({ type: "entity", entity });
pluginManager.notify({ type: "error", error });
pluginManager.notify({ type: "complete", summary });

// Cleanup when done
await pluginManager.cleanup();
```

## Built-in Plugins

### FSPlugin

The filesystem plugin exports entities to JSON files on disk.

**Features:**

- Creates directory structure by entity type
- Writes entities as JSON files
- Generates export summary file
- Handles file system errors gracefully

**Configuration:**

```typescript
const fsPlugin = new FSPlugin({
  outputDir: "./my-export",
  // other config options
});
```

**File Structure:**

```
my-export/
├── page/
│   ├── entity-id-1.json
│   └── entity-id-2.json
├── block/
│   ├── block-id-1.json
│   └── block-id-2.json
└── export-summary.json
```

## Error Handling

The plugin system implements robust error handling:

1. **Plugin Initialization Errors**: Logged and isolated - failing plugins won't crash the system
2. **Event Handler Errors**: Caught and logged - other plugins continue processing
3. **Cleanup Errors**: Handled gracefully during shutdown

```typescript
// Error handling in plugins
onEntity(entity: NotionEntity): Observable<void> {
  return new Observable<void>((subscriber) => {
    try {
      // Process entity
      subscriber.next();
      subscriber.complete();
    } catch (error) {
      subscriber.error(error);
    }
  });
}
```

## Advanced Features

### Asynchronous Processing

Plugins can perform asynchronous operations using RxJS observables:

```typescript
onEntity(entity: NotionEntity): Observable<void> {
  return new Observable<void>((subscriber) => {
    // Async operation
    processEntityAsync(entity)
      .then(() => {
        subscriber.next();
        subscriber.complete();
      })
      .catch(error => subscriber.error(error));
  });
}
```

### Plugin Communication

Plugins can communicate through the event system:

```typescript
class LoggerPlugin implements ExportPlugin {
  private processedCount = 0;

  onEntity(entity: NotionEntity): Observable<void> {
    this.processedCount++;
    if (this.processedCount % 100 === 0) {
      console.log(`Processed ${this.processedCount} entities`);
    }
    return of(undefined);
  }
}
```

### Configuration Management

Plugins can access configuration through the export start event:

```typescript
class ConfigurablePlugin implements ExportPlugin {
  private config: ExporterConfig;

  onExportStart(config: ExporterConfig): Observable<void> {
    this.config = config;
    console.log("Debug mode:", config.debug);
    return of(undefined);
  }
}
```

## Plugin Registry API

The plugin system provides a global registry for managing plugins:

```typescript
// Initialize system
initPluginSystem(commands);

// Register plugin
registerPlugin(pluginInstance);

// Get plugin
const plugin = getPlugin("plugin-name");

// Get all plugins
const allPlugins = getAllPlugins();

// Unregister plugin
unregisterPlugin("plugin-name");

// Clear all plugins
clearPlugins();
```

## Best Practices

1. **Error Handling**: Always handle errors gracefully in plugin methods
2. **Resource Cleanup**: Implement proper cleanup in the `cleanup()` method
3. **Logging**: Use meaningful log messages for debugging
4. **Configuration**: Make plugins configurable through the export config
5. **Testing**: Write comprehensive tests for plugin functionality

## Testing

The plugin system includes comprehensive test coverage:

```typescript
import { describe, it, expect, vi } from "vitest";
import { ExportPluginManager, FSPlugin } from "@mateothegreat/notion-sync";

describe("MyPlugin", () => {
  it("should process entities correctly", () => {
    const plugin = new MyPlugin();
    const entity = { id: "test", type: "page" };
    
    return new Promise<void>((resolve) => {
      plugin.onEntity(entity).subscribe({
        complete: () => {
          expect(true).toBe(true);
          resolve();
        }
      });
    });
  });
});
```

## Integration with Export Stream

The plugin system integrates seamlessly with the export stream:

```typescript
import { ExportStream } from "@mateothegreat/notion-sync";

const exportStream = new ExportStream({
  token: "your-token",
  outputDir: "./export",
  plugins: [FSPlugin] // Plugins are automatically managed
});

// Execute export - plugins are notified of all events
const result = await exportStream.execute().toPromise();
```

## Conclusion

The plugin system provides a powerful, extensible architecture for processing Notion export data. It handles errors gracefully, supports asynchronous operations, and provides a clean API for plugin development. The built-in FSPlugin serves as both a useful default and a reference implementation for creating custom plugins.

## Examples

For more examples and plugin templates, see the `/examples` directory in the project repository.
