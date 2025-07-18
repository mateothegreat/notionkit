# Enhanced SearchOperator with Streaming Pagination

The `SearchOperator` has been enhanced to support streaming pagination with progress tracking, metrics monitoring, and composable data transformations.

## Key Features

- ✅ **Streaming Pagination**: Automatically handles `has_more` and `next_cursor` for seamless pagination
- ✅ **Progress Tracking**: Real-time progress updates with configurable intervals
- ✅ **Metrics Monitoring**: Throughput, latency, error rates, and performance metrics
- ✅ **Composable Operators**: Chain transformations like filters, maps, and flattening
- ✅ **Cancellation Support**: Cancel streams at any time
- ✅ **Error Handling**: Graceful error handling with retry capabilities
- ✅ **Factory Functions**: Create preconfigured operators with defaults

## Basic Usage

```typescript
import { SearchOperator } from "./search-operators";

const operator = new SearchOperator();

const { stream, progress, metrics, cancel } = operator.execute(
  {
    query: "minecraft",
    filter: {
      value: "page",
      property: "object"
    },
    page_size: 10
  },
  {
    baseUrl: "https://api.notion.com/v1",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28"
    },
    progress: {
      enabled: true,
      interval: 1000 // Progress updates every second
    },
    metrics: {
      enabled: true,
      interval: 2000 // Metrics updates every 2 seconds
    }
  }
);

// Subscribe to paginated results
stream.subscribe((page) => {
  console.log("✅ Search result:", page.results.length);
  // Process each page of results
});

// Track progress
progress.subscribe((progress) => {
  console.log("✅ Progress:", progress.message);
});

// Monitor metrics
metrics.subscribe((metric) => {
  console.log("✅ Metric:", metric.throughput.toFixed(2), "req/s");
});

// Cancel if needed
setTimeout(() => cancel(), 30000);
```

## Composable Operators

Transform and filter data using composable operators:

```typescript
import { searchComposables } from "./search-operators";

// Apply multiple transformations
const transformedStream = stream.pipe(
  searchComposables.filterByType("page"),    // Only pages
  searchComposables.excludeArchived(),       // Exclude archived
  searchComposables.simplify()               // Simplify to basic format
);

// Flatten all results into individual items
const flattenedStream = stream.pipe(
  searchComposables.flatten(),
  take(10) // Take first 10 individual items
);

// Batch results into groups
const batchedStream = stream.pipe(
  searchComposables.flatten(),
  searchComposables.batch(5) // Groups of 5
);
```

## Available Composable Operators

### `filterByType(type)`

Filter results by object type ("page" or "database").

### `excludeArchived()`

Remove archived items from results.

### `simplify()`

Transform results to a simpler format with just `id`, `object`, and `title`.

### `flatten()`

Flatten all results into a stream of individual items.

### `batch(size)`

Group results into batches of specified size.

## Factory Functions

Create preconfigured operators:

```typescript
import { createSearchOperator, withProgress, withMetrics } from "./search-operators";

// Create operator with default configuration
const operator = createSearchOperator({
  enableProgress: true,
  enableMetrics: true,
  progressInterval: 500,
  metricsInterval: 3000
});

// Enhance existing operator
const enhancedOperator = withProgress(
  withMetrics(operator, {
    enabled: true,
    interval: 1000
  }),
  {
    enabled: true,
    interval: 2000
  }
);
```

## Progress Information

Progress updates include:

```typescript
interface ProgressInfo {
  current: number;        // Current page number
  total?: number;         // Total pages (if known)
  percentage?: number;    // Completion percentage
  message?: string;       // Human-readable message
  stage?: string;         // Current stage (fetching, complete)
}
```

## Metrics Information

Metrics updates include:

```typescript
interface MetricsInfo {
  requestCount: number;     // Total requests made
  totalDuration: number;    // Total time spent
  averageDuration: number;  // Average request duration
  errorCount: number;       // Number of errors
  successCount: number;     // Number of successful requests
  throughput: number;       // Requests per second
  timestamp: Date;          // Current timestamp
}
```

## Configuration Options

### Progress Configuration

```typescript
interface ProgressConfig {
  enabled: boolean;        // Enable progress tracking
  interval: number;        // Update interval in milliseconds
  estimateTotal?: boolean; // Attempt to estimate total pages
}
```

### Metrics Configuration

```typescript
interface MetricsConfig {
  enabled: boolean;          // Enable metrics tracking
  interval: number;          // Update interval in milliseconds
  includeLatency?: boolean;  // Include latency metrics
  includeErrorRates?: boolean; // Include error rate metrics
}
```

## Error Handling

The operator provides robust error handling:

```typescript
stream.pipe(
  catchError(error => {
    console.error("❌ Stream error:", error);
    // Return fallback data or empty result
    return of({
      results: [],
      has_more: false,
      next_cursor: null,
      object: "list",
      request_id: "error-fallback",
      type: "page_or_database"
    });
  })
).subscribe({
  next: (page) => console.log("Result:", page.results.length),
  error: (error) => console.error("Final error:", error)
});
```

## Real-time Dashboard Integration

Perfect for building real-time dashboards:

```typescript
let totalItems = 0;
let pageCount = 0;

progress.subscribe(p => {
  // Update progress bar
  progressBar.style.width = `${p.percentage || 0}%`;
  progressText.textContent = p.message;
});

metrics.subscribe(m => {
  // Update metrics display
  requestCount.textContent = m.requestCount.toString();
  throughput.textContent = `${m.throughput.toFixed(2)} req/s`;
  avgDuration.textContent = `${m.averageDuration.toFixed(0)}ms`;
});

stream.subscribe({
  next: (page) => {
    totalItems += page.results.length;
    pageCount++;
    
    // Update dashboard
    totalItemsDisplay.textContent = totalItems.toString();
    pageCountDisplay.textContent = pageCount.toString();
  }
});
```

## Advanced Composition

Create custom composable operators:

```typescript
const customOperator = operator.compose(
  searchComposables.filterByType("page"),
  searchComposables.excludeArchived(),
  searchComposables.simplify()
);

const customStream = customOperator(stream);
```

## Best Practices

1. **Enable Progress/Metrics**: Always enable progress and metrics for better user experience
2. **Handle Errors**: Implement proper error handling and fallback strategies
3. **Cancel Long Operations**: Use the cancel function for long-running operations
4. **Use Composable Operators**: Chain operators for clean data transformation
5. **Monitor Performance**: Watch metrics to optimize API usage
6. **Test Thoroughly**: Test with various query types and edge cases

## Test Results

The implementation has been thoroughly tested with:

- ✅ Streaming pagination with multiple pages
- ✅ Progress tracking with real-time updates
- ✅ Metrics monitoring with throughput calculations
- ✅ Composable operators for data transformation
- ✅ Cancellation support
- ✅ Error handling and recovery
- ✅ Factory functions and higher-order operators

Example test output shows successful pagination through multiple pages with progress and metrics tracking working correctly.
