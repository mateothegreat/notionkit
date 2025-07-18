/**
 * Creates a branded type to ensure type safety for different ID types.
 *
 * @template Brand - The brand identifier for the type.
 */
export type Branded<T, Brand extends string> = T & { readonly __brand: Brand };

/**
 * Page identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const pageId: PageId = toPageId('16ad7342e57180c4a065c7a1015871d3');
 * ```
 */
export type PageId = Branded<string, "PageId">;

/**
 * Database identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const dbId: DatabaseId = toDatabaseId('16ad7342e57180c4a065c7a1015871d3');
 * ```
 */
export type DatabaseId = Branded<string, "DatabaseId">;

/**
 * Block identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const blockId: BlockId = toBlockId('16ad7342e57180c4a065c7a1015871d3');
 * ```
 */
export type BlockId = Branded<string, "BlockId">;

/**
 * User identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const userId: UserId = toUserId('16ad7342e57180c4a065c7a1015871d3');
 * ```
 */
export type UserId = Branded<string, "UserId">;

/**
 * Comment identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const commentId: CommentId = toCommentId('16ad7342e57180c4a065c7a1015871d3');
 * ```
 */
export type CommentId = Branded<string, "CommentId">;

/**
 * Workspace identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const workspaceId: WorkspaceId = toWorkspaceId('16ad7342e57180c4a065c7a1015871d3');
 * ```
 */
export type WorkspaceId = Branded<string, "WorkspaceId">;

/**
 * Validates that a string is a valid Notion ID format.
 * Accepts both 32-character hex strings and UUID format (with hyphens).
 *
 * @param id - The ID string to validate.
 * @throws {Error} If the ID format is invalid.
 */
function validateNotionId(id: string): void {
  const cleanId = id.replace(/-/g, "");
  if (cleanId.length !== 32) {
    throw new Error(`Invalid Notion ID: expected 32 characters, got ${cleanId.length}`);
  }
  if (!/^[0-9a-f]{32}$/i.test(cleanId)) {
    throw new Error(`Invalid Notion ID: must contain only hexadecimal characters`);
  }
}

/**
 * Creates a validated PageId from a string.
 *
 * @param id - The page ID string to validate and convert.
 * @throws {Error} If the ID format is invalid.
 */
export const toPageId = (id: string): PageId => {
  validateNotionId(id);
  return id as PageId;
};

/**
 * Creates a validated DatabaseId from a string.
 *
 * @param id - The database ID string to validate and convert.
 * @throws {Error} If the ID format is invalid.
 */
export const toDatabaseId = (id: string): DatabaseId => {
  validateNotionId(id);
  return id as DatabaseId;
};

/**
 * Creates a validated BlockId from a string.
 *
 * @param id - The block ID string to validate and convert.
 * @throws {Error} If the ID format is invalid.
 */
export const toBlockId = (id: string): BlockId => {
  validateNotionId(id);
  return id as BlockId;
};

/**
 * Creates a validated UserId from a string.
 *
 * @param id - The user ID string to validate and convert.
 * @throws {Error} If the ID format is invalid.
 */
export const toUserId = (id: string): UserId => {
  validateNotionId(id);
  return id as UserId;
};

/**
 * Creates a validated CommentId from a string.
 *
 * @param id - The comment ID string to validate and convert.
 * @throws {Error} If the ID format is invalid.
 */
export const toCommentId = (id: string): CommentId => {
  validateNotionId(id);
  return id as CommentId;
};

/**
 * Creates a validated WorkspaceId from a string.
 *
 * @param id - The workspace ID string to validate and convert.
 * @throws {Error} If the ID format is invalid.
 */
export const toWorkspaceId = (id: string): WorkspaceId => {
  validateNotionId(id);
  return id as WorkspaceId;
};
