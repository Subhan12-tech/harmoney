"use client";

import { useEffect, useState } from "react";

/**
 * Runs an async data getter and returns its latest result.
 *
 * The mock getters in `lib/data.ts` resolve immediately, but going through a
 * promise here means the call sites already handle the shape a real network
 * request has — including out-of-order responses, which the `cancelled` guard
 * discards so a slow request for org A cannot overwrite org B's data.
 */
export function useAsyncData<T>(getter: () => Promise<T>, deps: unknown[], initial: T): T {
  const [data, setData] = useState<T>(initial);

  useEffect(() => {
    let cancelled = false;
    getter().then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return data;
}

/**
 * The same, but for reads where "still loading" and "came back empty" have to
 * be told apart — a missing document should render a not-found state, not an
 * empty one, and only once the read has actually resolved.
 */
export function useAsyncResource<T>(
  getter: () => Promise<T>,
  deps: unknown[],
): { data: T | undefined; loading: boolean } {
  const [state, setState] = useState<{ data: T | undefined; loading: boolean }>({
    data: undefined,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    setState((s) => (s.loading ? s : { ...s, loading: true }));
    getter().then((result) => {
      if (!cancelled) setState({ data: result, loading: false });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
