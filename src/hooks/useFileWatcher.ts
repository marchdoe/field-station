import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export function useFileWatcher() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const sse = new EventSource("/api/watch");

    sse.addEventListener("change", () => {
      queryClient.invalidateQueries();
    });

    return () => {
      sse.close();
    };
  }, [queryClient]);
}
