import { Client as NotionClient } from "@notionhq/client";
import { EMPTY, from, merge, Observable, of, ReplaySubject, Subject } from "rxjs";
import { catchError, concatMap, finalize, map, share, takeUntil, tap, toArray } from "rxjs/operators";
import { ExportPluginManager } from "../plugins";
import type {
  ExporterConfig,
  ExportEventPayload,
  ExportSummary,
  NotionBlock,
  NotionDatabase,
  NotionEntity,
  NotionPage
} from "../types";
import { PerformanceTracker } from "../utils";

/**
 * Main export stream service for processing Notion content.
 *
 * Handles the export process with event-driven architecture using RxJS streams.
 */
export class ExportStream {
  private client: NotionClient;
  private events$: ReplaySubject<ExportEventPayload>;
  private pluginManager: ExportPluginManager;
  private performanceTracker = new PerformanceTracker();
  private stop$ = new Subject<void>();
  private completed$ = new Subject<void>();
  private cursor: Map<string, string> = new Map();
  private totalItems = 0;
  private completedItems = 0;

  constructor(private config: ExporterConfig) {
    this.client = new NotionClient({ auth: config.token });
    this.events$ = new ReplaySubject<ExportEventPayload>(10); // Buffer last 10 events
    this.pluginManager = new ExportPluginManager(config.plugins || []);

    this.setupEventListeners();
    this.emitEvent({ type: "start", config });
  }

  /**
   * Execute the export process.
   *
   * @returns Observable with success status and summary
   */
  execute(): Observable<{ success: boolean; summary: ExportSummary }> {
    if (this.config.workspace) {
      return this.processWorkspace(this.config.workspace).pipe(takeUntil(this.stop$));
    }

    return this.getAllWorkspaces().pipe(
      concatMap((workspaces: NotionEntity[]) =>
        merge(
          ...workspaces.map((workspace) =>
            this.processWorkspace(workspace.id).pipe(
              catchError((err) => {
                this.emitError(err);
                return of({ success: false, summary: this.performanceTracker.getSummary() });
              })
            )
          )
        )
      ),
      toArray(),
      map(() => ({ success: true, summary: this.performanceTracker.getSummary() })),
      catchError((error) => {
        this.emitError(error);
        return of({ success: false, summary: this.performanceTracker.getSummary() });
      }),
      finalize(() => this.complete()),
      takeUntil(this.stop$)
    );
  }

  /**
   * Process a single workspace.
   */
  private processWorkspace(workspaceId: string): Observable<{ success: boolean; summary: ExportSummary }> {
    return from(this.getWorkspace(workspaceId)).pipe(
      concatMap((workspace) =>
        merge(
          this.processEntity(workspace),
          this.getDatabasesForWorkspace(workspace.id).pipe(concatMap((database) => this.processDatabase(database)))
        )
      ),
      toArray(),
      map(() => ({ success: true, summary: this.performanceTracker.getSummary() })),
      catchError((error) => {
        this.emitError(error);
        return of({ success: false, summary: this.performanceTracker.getSummary() });
      })
    );
  }

  /**
   * Process a database entity.
   */
  private processDatabase(database: NotionDatabase): Observable<null> {
    return merge(
      this.processEntity(database),
      from(this.getPagesForDatabase(database.id)).pipe(concatMap((page) => this.processPage(page)))
    );
  }

  /**
   * Process a page entity.
   */
  private processPage(page: NotionPage): Observable<null> {
    return merge(this.processEntity(page), this.processBlocks(page.children || []));
  }

  /**
   * Process blocks recursively.
   */
  private processBlocks(blocks: NotionBlock[]): Observable<null> {
    if (blocks.length === 0) {
      return of(null as null);
    }

    return merge(...blocks.map((block) => merge(this.processEntity(block), this.processBlocks(block.children || []))));
  }

  /**
   * Process a single entity.
   */
  private processEntity(entity: NotionEntity): Observable<null> {
    return of(entity).pipe(
      tap(() => this.emitEntity(entity)),
      map(() => null as null)
    );
  }

  // Event emission methods
  private emitEntity(entity: NotionEntity): void {
    this.emitEvent({ type: "entity", entity });
    this.performanceTracker.recordSuccess();
    this.performanceTracker.recordTypeProcessed(entity.type);
    this.progressAddComplete();
  }

  private emitError(error: Error, entity?: NotionEntity): void {
    this.emitEvent({ type: "error", error, entity });
    this.performanceTracker.recordError(error);
  }

  private emitEvent(payload: ExportEventPayload): void {
    this.events$.next(payload);
    this.pluginManager.notify(payload);
  }

  private complete(): void {
    if (!this.completed$.closed) {
      this.completed$.next();
      this.completed$.complete();
      this.emitEvent({
        type: "complete",
        summary: this.performanceTracker.getSummary()
      });
      this.events$.complete();
    }
  }

  // Public event observables
  onEvent(): Observable<ExportEventPayload> {
    return this.events$.asObservable().pipe(share());
  }

  onError(): Observable<Error> {
    return this.events$.asObservable().pipe(
      map((payload) => {
        if (payload.type === "error") {
          return payload.error;
        }
        return null;
      }),
      filter((error): error is Error => error !== null),
      share()
    );
  }

  onComplete(): Observable<ExportSummary> {
    return this.completed$.asObservable().pipe(
      concatMap(async (): Promise<Observable<ExportSummary>> => {
        const observable = await this.performanceTracker.getSummaryObservable();
        return observable;
      }),
      concatMap((obs: Observable<ExportSummary>) => obs)
    );
  }

  // Control methods
  stop(): void {
    this.stop$.next();
    this.stop$.complete();
  }

  async cleanup(): Promise<void> {
    await this.pluginManager.cleanup();
  }

  // Private helper methods
  private setupEventListeners(): void {
    this.events$.subscribe((payload) => {
      console.log(`[ExportStream] Event: ${payload.type}`);
    });
  }

  // Progress tracking
  private progressAddTotal(): void {
    this.totalItems++;
    this.emitProgress();
  }

  private progressAddComplete(): void {
    this.completedItems++;
    this.emitProgress();
  }

  private emitProgress(): void {
    if (this.totalItems > 0) {
      this.emitEvent({
        type: "progress",
        complete: this.completedItems,
        total: this.totalItems
      });
    }
  }

  // Notion API methods (to be implemented)
  private getAllWorkspaces(): Observable<NotionEntity[]> {
    // TODO: Implement actual Notion API call
    return of([]);
  }

  private async getWorkspace(workspaceId: string): Promise<NotionEntity> {
    // TODO: Implement actual Notion API call
    return { id: workspaceId, type: "workspace" };
  }

  private getDatabasesForWorkspace(workspaceId: string): Observable<NotionDatabase> {
    // TODO: Implement actual Notion API call
    return EMPTY;
  }

  private getPagesForDatabase(databaseId: string): NotionPage[] {
    // TODO: Implement actual Notion API call
    return [];
  }
}

// Utility function to ensure proper type
function filter<T>(predicate: (value: any) => value is T): import("rxjs").OperatorFunction<any, T> {
  return (source: Observable<any>) =>
    new Observable<T>((subscriber) => {
      return source.subscribe({
        next(value) {
          if (predicate(value)) {
            subscriber.next(value);
          }
        },
        error(err) {
          subscriber.error(err);
        },
        complete() {
          subscriber.complete();
        }
      });
    });
}
