import { ExportPlugin } from "$lib/plugins";

/**
 * Base Notion entity type representing all possible entity types in the system.
 */
export type NotionEntityType =
  | "workspace"
  | "page"
  | "block"
  | "database"
  | "user"
  | "comment"
  | "relation"
  | "composition";

/**
 * Base entity interface that all Notion entities extend from.
 *
 * @property id - Unique identifier for the entity
 * @property type - The type of entity
 * @property parent - Optional parent relationship information
 */
export interface NotionEntity {
  id: string;
  type: NotionEntityType;
  parent?: {
    type: string;
    database_id?: string;
    page_id?: string;
    workspace_id?: string;
    block_id?: string;
  };
}

/**
 * Page entity interface representing a Notion page.
 *
 * @property type - Always "page" for page entities
 * @property title - Array of text content for the page title
 * @property properties - Optional key-value properties of the page
 * @property created_time - ISO string of creation timestamp
 * @property last_edited_time - ISO string of last edit timestamp
 * @property archived - Whether the page is archived
 * @property children - Optional array of child blocks
 */
export interface NotionPage extends NotionEntity {
  type: "page";
  title: string[];
  properties?: Record<string, unknown>;
  created_time: string;
  last_edited_time: string;
  archived: boolean;
  children?: NotionBlock[];
}

/**
 * Block entity interface representing a Notion block.
 *
 * @property type - Always "block" for block entities
 * @property blockType - The specific type of block (paragraph, heading, etc.)
 * @property content - Optional text content of the block
 * @property children - Optional array of nested child blocks
 * @property components - Optional component metadata
 * @property created_time - ISO string of creation timestamp
 * @property last_edited_time - ISO string of last edit timestamp
 */
export interface NotionBlock extends NotionEntity {
  type: "block";
  blockType: string;
  content?: string;
  children?: NotionBlock[];
  components?: Record<string, unknown>;
  created_time: string;
  last_edited_time: string;
}

/**
 * Database entity interface representing a Notion database.
 *
 * @property type - Always "database" for database entities
 * @property title - Array of text content for the database title
 * @property schema - Array of blocks that define the database schema
 * @property properties - Database property definitions
 * @property created_time - ISO string of creation timestamp
 * @property last_edited_time - ISO string of last edit timestamp
 */
export interface NotionDatabase extends NotionEntity {
  type: "database";
  title: string[];
  schema: NotionBlock[];
  properties: Record<string, unknown>;
  created_time: string;
  last_edited_time: string;
}

/**
 * User entity interface representing a Notion user.
 *
 * @property type - Always "user" for user entities
 * @property name - Display name of the user
 * @property email - Optional email address
 * @property avatarUrl - Optional URL to user's avatar image
 * @property status - Optional user status
 */
export interface NotionUser extends NotionEntity {
  type: "user";
  name: string;
  email?: string;
  avatarUrl?: string;
  status?: string;
}

/**
 * Comment entity interface representing a Notion comment.
 *
 * @property type - Always "comment" for comment entities
 * @property content - Array of text content for the comment
 * @property created_time - ISO string of creation timestamp
 * @property last_edited_time - ISO string of last edit timestamp
 * @property user - Optional user who created the comment
 */
export interface NotionComment extends NotionEntity {
  type: "comment";
  content: string[];
  created_time: string;
  last_edited_time: string;
  user?: NotionUser;
}

/**
 * Export configuration interface for controlling the export process.
 *
 * @property token - Required Notion API token for authentication
 * @property workspace - Optional workspace ID to limit export scope
 * @property outputDir - Optional output directory for exported files
 * @property parallelLimit - Optional limit for parallel API requests
 * @property maxRetries - Optional maximum retry attempts for failed requests
 * @property retryDelay - Optional delay in milliseconds between retries
 * @property plugins - Optional array of plugin names to load
 * @property debug - Optional flag to enable debug logging
 */
export interface ExporterConfig {
  token: string;
  workspace?: string;
  outputDir?: string;
  parallelLimit?: number;
  maxRetries?: number;
  retryDelay?: number;
  plugins?: ExportPlugin[];
  debug?: boolean;
}

/**
 * Export event payload types for different stages of the export process.
 *
 * @property type - The type of event
 * @property config - Configuration for start events
 * @property entity - Entity data for entity events
 * @property error - Error object for error events
 * @property summary - Summary data for complete events
 * @property complete - Number of completed items for progress events
 * @property total - Total number of items for progress events
 */
export type ExportEventPayload =
  | { type: "start"; config: ExporterConfig }
  | { type: "entity"; entity: NotionEntity }
  | { type: "error"; error: Error; entity?: NotionEntity }
  | { type: "complete"; summary: ExportSummary }
  | { type: "progress"; complete: number; total: number };

/**
 * Export summary interface containing statistics about the export process.
 *
 * @property successCount - Number of successfully processed entities
 * @property errorCount - Number of errors encountered
 * @property processedTypes - Count of processed entities by type
 * @property duration - Total duration of export in milliseconds
 * @property lastError - Optional last error encountered
 */
export interface ExportSummary {
  successCount: number;
  errorCount: number;
  processedTypes: Record<string, number>;
  duration: number;
  lastError?: Error;
}
