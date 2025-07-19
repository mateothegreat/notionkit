export type Scenario<T> = {
  name: string;
  request: T;
  expected: {
    requests: number;
  };
  limits?: {
    results?: number;
    requests?: number;
  };
  timeout?: number;
};
