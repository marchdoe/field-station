import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ConfigLayerSource, JsonObject, JsonValue } from "@/types/config";
import { AddSettingForm } from "./AddSettingForm";
import { LayerBadge } from "./LayerBadge";
import { SettingActions } from "./SettingActions";

interface SettingsViewerProps {
  settings: JsonObject;
  source?: "global" | "global-local" | "project" | "project-local" | "merged" | string;
  editable?: boolean;
  onUpdate?: (keyPath: string, value: JsonValue) => void;
  onDelete?: (keyPath: string) => void;
  onMove?: (keyPath: string, targetLayer: ConfigLayerSource) => void;
  onAdd?: (keyPath: string, value: JsonValue) => void;
}

function isObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function renderValue(value: JsonValue, depth = 0): React.ReactNode {
  if (typeof value === "boolean") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-sm",
          value ? "text-success" : "text-danger",
        )}
      >
        <span
          className={cn("inline-block h-2 w-2 rounded-full", value ? "bg-success" : "bg-danger")}
        />
        {value ? "true" : "false"}
      </span>
    );
  }

  if (Array.isArray(value)) {
    const hasObjects = value.some(isObject);
    if (hasObjects) {
      return (
        <div className="mt-1 space-y-2">
          {value.map((item, i) => (
            <div key={i} className="rounded-lg border border-border-muted bg-surface-2/50 p-3">
              {isObject(item) ? (
                <div className="space-y-1.5">
                  {Object.entries(item).map(([k, v]) => (
                    <div key={k} className="flex items-baseline gap-2">
                      <span className="shrink-0 text-sm text-text-muted">{k}:</span>
                      {renderValue(v, depth + 1)}
                    </div>
                  ))}
                </div>
              ) : (
                renderValue(item, depth + 1)
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="mt-1 space-y-1">
        {value.map((item, i) => (
          <div key={i}>
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-text-secondary">
              {String(item)}
            </code>
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "string") {
    // Long strings: render as a block
    if (value.length > 120) {
      return (
        <code className="mt-1 block rounded bg-surface-2 px-2 py-1.5 text-xs text-text-secondary break-all">
          {value}
        </code>
      );
    }
    return (
      <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm text-text-primary">{value}</code>
    );
  }

  if (typeof value === "number") {
    return (
      <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm text-text-primary">
        {String(value)}
      </code>
    );
  }

  if (value === null || value === undefined) {
    return <span className="text-sm italic text-text-muted">null</span>;
  }

  // Fallback for any object type not caught above
  if (isObject(value)) {
    return (
      <div className="mt-1 ml-3 space-y-1.5 border-l border-border-muted pl-3">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-2">
            <span className="shrink-0 text-sm text-text-muted">{k}:</span>
            {renderValue(v, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// Serialize a JsonValue into a string suitable for the inline editor
function serializeForEdit(value: JsonValue): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

// Determine the editor type for a given value
function editorTypeFor(value: JsonValue): "string" | "number" | "boolean" | "json" {
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "json";
}

// Parse the edited string back to a JsonValue
function parseEditedValue(raw: string, type: "string" | "number" | "boolean" | "json"): JsonValue {
  switch (type) {
    case "string":
      return raw;
    case "number":
      return Number(raw);
    case "boolean":
      return raw === "true";
    case "json":
      return JSON.parse(raw) as JsonValue;
  }
}

// Inline editor component for a single value
function InlineEditor({
  value,
  onSave,
  onCancel,
}: {
  value: JsonValue;
  onSave: (newValue: JsonValue) => void;
  onCancel: () => void;
}) {
  const type = editorTypeFor(value);
  const [raw, setRaw] = useState(serializeForEdit(value));
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    try {
      const parsed = parseEditedValue(raw, type);
      onSave(parsed);
    } catch {
      setError("Invalid value");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      {type === "boolean" ? (
        <select
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="bg-surface-0 border border-accent/50 rounded px-2 py-0.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : type === "json" ? (
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
          autoFocus
          rows={4}
          className="bg-surface-0 border border-accent/50 rounded px-2 py-1 text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent min-w-[200px]"
        />
      ) : (
        <input
          type={type === "number" ? "number" : "text"}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="bg-surface-0 border border-accent/50 rounded px-2 py-0.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent min-w-[120px]"
        />
      )}
      <button
        type="button"
        onClick={handleSave}
        title="Save"
        className="p-0.5 rounded hover:bg-success/20 text-success transition-colors"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        title="Cancel"
        className="p-0.5 rounded hover:bg-danger/20 text-danger transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}

// Editable context passed through the recursive rendering
interface EditableContext {
  editingKey: string | null;
  onStartEdit: (keyPath: string) => void;
  onSaveEdit: (keyPath: string, value: JsonValue) => void;
  onCancelEdit: () => void;
  onDelete: (keyPath: string) => void;
  onMove: (keyPath: string, targetLayer: ConfigLayerSource) => void;
  currentLayer: ConfigLayerSource;
}

// Renders a single key-value pair, optionally editable
function EditableSettingRow({
  keyName,
  keyPath,
  value,
  ctx,
}: {
  keyName: string;
  keyPath: string;
  value: JsonValue;
  ctx: EditableContext;
}) {
  const isEditing = ctx.editingKey === keyPath;

  return (
    <div className="group/setting flex items-baseline gap-2">
      <span className="shrink-0 text-sm text-text-muted">{keyName}:</span>
      {isEditing ? (
        <InlineEditor
          value={value}
          onSave={(newVal) => ctx.onSaveEdit(keyPath, newVal)}
          onCancel={ctx.onCancelEdit}
        />
      ) : (
        <>
          {renderValue(value)}
          <SettingActions
            currentLayer={ctx.currentLayer}
            onEdit={() => ctx.onStartEdit(keyPath)}
            onDelete={() => ctx.onDelete(keyPath)}
            onMove={(target) => ctx.onMove(keyPath, target)}
          />
        </>
      )}
    </div>
  );
}

// Editable version of SettingsSection that threads keyPath and edit context
function EditableSettingsSection({
  sectionKey,
  value,
  keyPathPrefix,
  ctx,
}: {
  sectionKey: string;
  value: JsonValue;
  keyPathPrefix: string;
  ctx: EditableContext;
}) {
  const fullKeyPath = keyPathPrefix ? `${keyPathPrefix}.${sectionKey}` : sectionKey;

  if (isObject(value)) {
    const entries = Object.entries(value);
    return (
      <div className="space-y-2">
        <div className="group/setting flex items-center gap-2">
          <h4 className="text-sm font-semibold text-text-primary">{sectionKey}</h4>
          <SettingActions
            currentLayer={ctx.currentLayer}
            onEdit={() => ctx.onStartEdit(fullKeyPath)}
            onDelete={() => ctx.onDelete(fullKeyPath)}
            onMove={(target) => ctx.onMove(fullKeyPath, target)}
          />
        </div>
        <div className="ml-3 space-y-1.5 border-l border-border-muted pl-3">
          {entries.map(([k, v]) => {
            if (isObject(v)) {
              return (
                <EditableSettingsSection
                  key={k}
                  sectionKey={k}
                  value={v}
                  keyPathPrefix={fullKeyPath}
                  ctx={ctx}
                />
              );
            }
            return (
              <EditableSettingRow
                key={k}
                keyName={k}
                keyPath={`${fullKeyPath}.${k}`}
                value={v}
                ctx={ctx}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="group/setting flex items-baseline gap-2">
      <span className="shrink-0 text-sm font-semibold text-text-primary">{sectionKey}:</span>
      {ctx.editingKey === fullKeyPath ? (
        <InlineEditor
          value={value}
          onSave={(newVal) => ctx.onSaveEdit(fullKeyPath, newVal)}
          onCancel={ctx.onCancelEdit}
        />
      ) : (
        <>
          {renderValue(value)}
          <SettingActions
            currentLayer={ctx.currentLayer}
            onEdit={() => ctx.onStartEdit(fullKeyPath)}
            onDelete={() => ctx.onDelete(fullKeyPath)}
            onMove={(target) => ctx.onMove(fullKeyPath, target)}
          />
        </>
      )}
    </div>
  );
}

// Read-only SettingsSection (original, unchanged)
function SettingsSection({ sectionKey, value }: { sectionKey: string; value: JsonValue }) {
  if (isObject(value)) {
    const entries = Object.entries(value);
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-text-primary">{sectionKey}</h4>
        <div className="ml-3 space-y-1.5 border-l border-border-muted pl-3">
          {entries.map(([k, v]) => {
            if (isObject(v)) {
              return <SettingsSection key={k} sectionKey={k} value={v} />;
            }
            return (
              <div key={k} className="flex items-baseline gap-2">
                <span className="shrink-0 text-sm text-text-muted">{k}:</span>
                {renderValue(v)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0 text-sm font-semibold text-text-primary">{sectionKey}:</span>
      {renderValue(value)}
    </div>
  );
}

export function SettingsViewer({
  settings,
  source,
  editable,
  onUpdate,
  onDelete,
  onMove,
  onAdd,
}: SettingsViewerProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const entries = Object.entries(settings);

  // When not editable, render the original read-only view
  if (!editable) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-1 p-5">
        {source && source !== "merged" && (
          <div className="mb-4">
            <LayerBadge
              source={source as "global" | "global-local" | "project" | "project-local"}
            />
          </div>
        )}

        {entries.length === 0 ? (
          <p className="text-sm text-text-muted">No settings configured.</p>
        ) : (
          <div className="space-y-4">
            {entries.map(([key, value]) => (
              <SettingsSection key={key} sectionKey={key} value={value} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Editable mode
  const currentLayer = (source && source !== "merged" ? source : "global") as ConfigLayerSource;

  const ctx: EditableContext = {
    editingKey,
    onStartEdit: (keyPath) => setEditingKey(keyPath),
    onSaveEdit: (keyPath, value) => {
      onUpdate?.(keyPath, value);
      setEditingKey(null);
    },
    onCancelEdit: () => setEditingKey(null),
    onDelete: (keyPath) => onDelete?.(keyPath),
    onMove: (keyPath, targetLayer) => onMove?.(keyPath, targetLayer),
    currentLayer,
  };

  return (
    <div className="rounded-xl border border-border-default bg-surface-1 p-5">
      {source && source !== "merged" && (
        <div className="mb-4">
          <LayerBadge source={source as "global" | "global-local" | "project" | "project-local"} />
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-text-muted">No settings configured.</p>
      ) : (
        <div className="space-y-4">
          {entries.map(([key, value]) => (
            <EditableSettingsSection
              key={key}
              sectionKey={key}
              value={value}
              keyPathPrefix=""
              ctx={ctx}
            />
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border-muted">
        {showAddForm ? (
          <AddSettingForm
            onAdd={(keyPath, value) => {
              onAdd?.(keyPath, value);
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-muted hover:text-accent rounded-lg hover:bg-surface-2 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Setting
          </button>
        )}
      </div>
    </div>
  );
}
