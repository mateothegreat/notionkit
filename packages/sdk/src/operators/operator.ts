import { randomUUID } from "node:crypto";
import type { HTTPConfig, HTTPResponse } from "../util/http/client";

/**
 * Configuration for operator execution.
 */
export class OperatorConfig {
  cache?: boolean;
  timeout?: number;
  limits?: {
    pages?: number;
    results?: number;
  };
  constructor(config: Partial<OperatorConfig> = {}) {
    this.cache = config.cache;
    this.timeout = config.timeout;
    this.limits = config.limits;
  }
}

/**
 * Metadata for operator execution results.
 */
export class OperatorMetadata {
  requestId: string;
  timestamp: Date;
  duration?: number;
  cached?: boolean;
  retryCount?: number;
  constructor(config: Partial<OperatorMetadata> = {}) {
    this.requestId = config.requestId ?? randomUUID();
    this.timestamp = config.timestamp ?? new Date();
    this.duration = config.duration;
    this.cached = config.cached;
    this.retryCount = config.retryCount;
  }
}

export type OperatorReport = {
  stage: "requesting" | "processing" | "complete";
  requests: number;
  total: number;
  cursor?: string | null;
  errors: number;
  message?: string;
};

/**
 * Result wrapper for operator execution.
 */
export class OperatorResult<TData> {
  data: TData;
  metadata: OperatorMetadata;
  constructor(config: Partial<OperatorResult<TData>> = {}) {
    this.data = config.data as TData;
    this.metadata = new OperatorMetadata(config.metadata);
  }
}

/**
 * Abstract base class for all operators that implement this contract.
 */
export abstract class Operator<TPayload, TResponse> {
  /**
   * Execute the operator with the given request and configuration to be
   * implemented by subclasses.
   *
   * @template {TPayload} TPayload - The payload type.
   * @template {TResponse} TResponse - The response type.
   *
   * @param {TPayload} payload - The payload to be processed.
   * @param {HTTPConfig} searchConfig - The search configuration.
   * @param {OperatorConfig} operatorConfig - The operator configuration.
   *
   * @returns Observable of the response.
   */
  abstract execute(payload: TPayload, httpConfig: HTTPConfig, operatorConfig: OperatorConfig): HTTPResponse<TResponse>;
}
