import type { Search } from "@notion.codes/types";

export type Scenario = {
  name: string;
  request: Search;
  expected?: {
    results?: number;
    pages?: number;
  };
  timeout?: number;
};
