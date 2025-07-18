import { type PluginEvent, type PluginEventPayload } from "$plugins/plugin";
import { type Observer } from "rxjs";

/**
 * A subscriber to a specific `PluginEvent`.
 *
 * Uses a discriminated union instead of optional properties by
 * enforcing exactly one of observer or on, not both or none.
 *
 * This design allows flexibility for consumers to choose between
 * callback-based or observable-based event handling.
 *
 * Consumers may provide either:
 * - An rxjs `Observer`, which will receive payloads via the `next()` method.
 * - A callback function, invoked directly with the event and its payload.
 */
export type Subscriber<T extends PluginEvent> =
  | Observer<PluginEventPayload<T>>
  | ((event: T, payload: PluginEventPayload<T>) => void);

export type Subscription = {
  id: string;
};
