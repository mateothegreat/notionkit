import { NOTION_CONFIG_DEFAULTS } from "../../config";

/**
 * The configuration for an HTTP request.
 */
export class HTTPConfig {
  /**
   * The base URL of the request.
   */
  baseUrl: string;

  /**
   * The method of the request.
   */
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

  /**
   * The headers of the request.
   */
  headers?: Record<string, string>;

  /**
   * The timeout for the request in milliseconds.
   */
  timeout?: number;

  /**
   * The maximum number of retries for the request.
   */
  retries?: number;

  /**
   * The delay between retries in milliseconds.
   */
  backoff?: number;

  /**
   * The body of the request.
   */
  body?: any;

  constructor(config: Partial<HTTPConfig> & { token?: string } = {}) {
    /**
     * Mandatory values that must be set.
     */
    this.baseUrl = config.baseUrl ?? NOTION_CONFIG_DEFAULTS.baseUrl;
    this.headers = config.headers ?? {
      "Content-Type": "application/json",
      "Notion-Version": NOTION_CONFIG_DEFAULTS.version
    };
    if (config.token) {
      this.headers.Authorization = `Bearer ${config.token}`;
    }
    this.retries = config.retries ?? NOTION_CONFIG_DEFAULTS.retries;
    this.backoff = config.backoff ?? NOTION_CONFIG_DEFAULTS.backoff;
    /**
     * Optional values that can be set.
     */
    this.method = config.method;
    this.timeout = config.timeout;
    this.body = config.body;
  }
}
