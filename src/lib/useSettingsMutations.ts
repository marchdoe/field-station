import { useRouter } from "@tanstack/react-router";
import { type Dispatch, type SetStateAction, useCallback } from "react";
import { useToast } from "@/components/ui/Toast.js";
import { deleteSetting, moveSetting, updateSetting } from "@/server/functions/config-mutations.js";
import type { ConfigLayerSource, JsonValue } from "@/types/config.js";

export interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  action: () => Promise<void>;
}

export function useSettingsMutations(
  projectPath: string | undefined,
  setConfirmState: Dispatch<SetStateAction<ConfirmState | null>>,
) {
  const router = useRouter();
  const { toast } = useToast();

  const createHandlers = useCallback(
    (layer: ConfigLayerSource) => ({
      onUpdate: async (keyPath: string, value: JsonValue) => {
        try {
          await updateSetting({ data: { layer, keyPath, value, projectPath } });
          toast(`Updated "${keyPath}"`);
          router.invalidate();
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
              await deleteSetting({ data: { layer, keyPath, projectPath } });
              toast(`Deleted "${keyPath}"`);
              router.invalidate();
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
              await moveSetting({
                data: { fromLayer: layer, toLayer: targetLayer, keyPath, projectPath },
              });
              toast(`Moved "${keyPath}" to ${targetLayer}`);
              router.invalidate();
            } catch (e) {
              toast(`Failed to move "${keyPath}": ${(e as Error).message}`, "error");
            }
          },
        });
      },
      onAdd: async (keyPath: string, value: JsonValue) => {
        try {
          await updateSetting({ data: { layer, keyPath, value, projectPath } });
          toast(`Added "${keyPath}"`);
          router.invalidate();
        } catch (e) {
          toast(`Failed to add "${keyPath}": ${(e as Error).message}`, "error");
        }
      },
    }),
    [projectPath, router, toast, setConfirmState],
  );

  return { createHandlers };
}
