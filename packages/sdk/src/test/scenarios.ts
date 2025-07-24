export type Scenario<T> = {
  name: string;
  request: T;
  expected: {
    requests?: number;
    results?: number;
  };
  timeout?: number;
};
