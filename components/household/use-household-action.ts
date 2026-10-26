"use client";

import { useCallback, useRef, useState } from "react";

export function useHouseholdAction() {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = useCallback(
    async (action: () => Promise<unknown>, message: string) => {
      if (pending.current) return false;
      pending.current = true;
      setBusy(true);
      setError("");
      try {
        await action();
        return true;
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : message);
        return false;
      } finally {
        pending.current = false;
        setBusy(false);
      }
    },
    [],
  );
  return { busy, error, run };
}
