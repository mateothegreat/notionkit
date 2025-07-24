/**
 * Configuration for operator execution.
 */
export class OperatorConfig {
  cache?: boolean;
  timeout?: number;
  limits?: {
    requests?: number;
    results?: number;
  };
  constructor(config: Partial<OperatorConfig> = {}) {
    this.cache = config.cache;
    this.timeout = config.timeout;
    this.limits = config.limits;
  }
}

export type OperatorReport = {
  stage: "initializing" | "requesting" | "processing" | "complete";
  requests: number;
  items: number;
  cursor?: string | null;
  errors: number;
  message?: string;
};
