import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export function useFileWatcher() {
  const router = useRouter();

  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const sse = new EventSource("/api/watch");

    sse.addEventListener("change", () => {
      router.invalidate();
    });

    return () => {
      sse.close();
    };
  }, [router]);
}
