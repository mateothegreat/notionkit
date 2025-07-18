import { ExportConfig } from "./config";

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
 * @param id - Unique identifier for the entity
 * @param type - The type of entity
 * @param parent - Optional parent relationship information
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
 * @param type - Always "page" for page entities
 * @param title - Array of text content for the page title
 * @param properties - Optional key-value properties of the page
 * @param created_time - ISO string of creation timestamp
 * @param last_edited_time - ISO string of last edit timestamp
 * @param archived - Whether the page is archived
 * @param children - Optional array of child blocks
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
 * @param type - Always "block" for block entities
 * @param blockType - The specific type of block (paragraph, heading, etc.)
 * @param content - Optional text content of the block
 * @param children - Optional array of nested child blocks
 * @param components - Optional component metadata
 * @param created_time - ISO string of creation timestamp
 * @param last_edited_time - ISO string of last edit timestamp
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
 * @param type - Always "database" for database entities
 * @param title - Array of text content for the database title
 * @param schema - Array of blocks that define the database schema
 * @param properties - Database property definitions
 * @param created_time - ISO string of creation timestamp
 * @param last_edited_time - ISO string of last edit timestamp
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
 * @param type - Always "user" for user entities
 * @param name - Display name of the user
 * @param email - Optional email address
 * @param avatarUrl - Optional URL to user's avatar image
 * @param status - Optional user status
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
 * @param type - Always "comment" for comment entities
 * @param content - Array of text content for the comment
 * @param created_time - ISO string of creation timestamp
 * @param last_edited_time - ISO string of last edit timestamp
 * @param user - Optional user who created the comment
 */
export interface NotionComment extends NotionEntity {
  type: "comment";
  content: string[];
  created_time: string;
  last_edited_time: string;
  user?: NotionUser;
}

/**
 * Export event payload types for different stages of the export process.
 *
 * @param type - The type of event
 * @param config - Configuration for start events
 * @param entity - Entity data for entity events
 * @param error - Error object for error events
 * @param summary - Summary data for complete events
 * @param complete - Number of completed items for progress events
 * @param total - Total number of items for progress events
 */
export type ExportEventPayload =
  | { type: "start"; config: ExportConfig }
  | { type: "entity"; entity: NotionEntity }
  | { type: "error"; error: Error; entity?: NotionEntity }
  | { type: "complete"; summary: ExportSummary }
  | { type: "progress"; complete: number; total: number };

/**
 * Export summary interface containing statistics about the export process.
 *
 * @param successCount - Number of successfully processed entities
 * @param errorCount - Number of errors encountered
 * @param processedTypes - Count of processed entities by type
 * @param duration - Total duration of export in milliseconds
 * @param lastError - Optional last error encountered
 */
export interface ExportSummary {
  successCount: number;
  errorCount: number;
  processedTypes: Record<string, number>;
  duration: number;
  lastError?: Error;
}
