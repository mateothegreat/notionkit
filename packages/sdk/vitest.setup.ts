import { setup } from "@ark/attest";

export default () => {
  setup({
    updateSnapshots: false, // Prevent caching so tests are accurate.
    skipTypes: false,
    skipInlineInstantiations: false,
    benchPercentThreshold: 20,
    benchErrorOnThresholdExceeded: true
  });
};
