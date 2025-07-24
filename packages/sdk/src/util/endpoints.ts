import type { GetResourceType } from "@mateothegreat/notionkit-types/operations/get";

/**
 * Build the appropriate endpoint URL based on the resource type and request.
 * @see {@link GetResourceType}
 *
 * @param request - The get request.
 *
 * @returns The API endpoint URL.
 */
export const getEndpoint = (resource: GetResourceType, values: Record<string, string | number>): string => {
  switch (resource) {
    case "database":
      return `/databases/${values.id}`;
    case "page":
      return `/pages/${values.id}`;
    case "block":
      return `/blocks/${values.id}`;
    case "property":
      if ("page_id" in values && "property_id" in values) {
        return `/pages/${values.page_id}/properties/${values.property_id}`;
      }
      throw new Error("property requests require both page_id and property_id");
    default:
      throw new Error(`unknown resource type: ${resource}`);
  }
};
