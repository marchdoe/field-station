import { useQueryClient } from "@tanstack/react-query";
import { type Dispatch, type SetStateAction, useCallback } from "react";
import { useToast } from "@/components/ui/Toast.js";
import type { ConfigLayerSource } from "@/lib/api.js";
import * as api from "@/lib/api.js";
import type { JsonValue } from "@/types/config.js";

export interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  action: () => Promise<void>;
}

export function useSettingsMutations(
  projectId: string | undefined,
  setConfirmState: Dispatch<SetStateAction<ConfirmState | null>>,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createHandlers = useCallback(
    (layer: ConfigLayerSource) => ({
      onUpdate: async (keyPath: string, value: JsonValue) => {
        try {
          await api.updateConfigSetting({ keyPath, value, projectId });
          toast(`Updated "${keyPath}"`);
          queryClient.invalidateQueries({ queryKey: ["config"] });
        } catch (e) {
          toast(`Failed to update "${keyPath}": ${(e as Error).message}`, "error");
        }
      },
      onDelete: (keyPath: string) => {
        setConfirmState({
          open: true,
          title: "Delete Setting",
          message: `Are you sure you want to delete "${keyPath}" from the ${layer} layer?`,
          action: async () => {
            try {
              await api.deleteConfigSetting({ keyPath, projectId });
              toast(`Deleted "${keyPath}"`);
              queryClient.invalidateQueries({ queryKey: ["config"] });
            } catch (e) {
              toast(`Failed to delete "${keyPath}": ${(e as Error).message}`, "error");
            }
          },
        });
      },
      onMove: (keyPath: string, targetLayer: ConfigLayerSource) => {
        setConfirmState({
          open: true,
          title: "Move Setting",
          message: `Move "${keyPath}" from ${layer} to ${targetLayer}?`,
          action: async () => {
            try {
              // Moving TO "global-local" = promoting up; moving TO "global" = demoting down
              const direction: "up" | "down" = targetLayer === "global-local" ? "up" : "down";
              await api.moveConfigSetting({ keyPath, direction });
              toast(`Moved "${keyPath}" to ${targetLayer}`);
              queryClient.invalidateQueries({ queryKey: ["config"] });
            } catch (e) {
              toast(`Failed to move "${keyPath}": ${(e as Error).message}`, "error");
            }
          },
        });
      },
      onAdd: async (keyPath: string, value: JsonValue) => {
        try {
          await api.updateConfigSetting({ keyPath, value, projectId });
          toast(`Added "${keyPath}"`);
          queryClient.invalidateQueries({ queryKey: ["config"] });
        } catch (e) {
          toast(`Failed to add "${keyPath}": ${(e as Error).message}`, "error");
        }
      },
    }),
    [projectId, queryClient, toast, setConfirmState],
  );

  return { createHandlers };
}
