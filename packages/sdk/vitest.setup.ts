import { setup } from "@ark/attest";

export default () => {
  setup({
    updateSnapshots: false, // Prevent caching with arktype's attest() calls.
    skipTypes: false,
    skipInlineInstantiations: false,
    benchPercentThreshold: 20,
    benchErrorOnThresholdExceeded: true
  });
};
