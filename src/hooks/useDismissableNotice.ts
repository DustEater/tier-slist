import { useEffect, useRef, useState } from "react";

type Notice = { kind: "success" | "error"; text: string } | null;

export function useDismissableNotice(dismissMs = 4000) {
  const [notice, setNotice] = useState<Notice>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  function showNotice(next: Notice) {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    setNotice(next);
    if (next) {
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setNotice(null);
      }, dismissMs);
    }
  }

  return { notice, showNotice } as const;
}