import { Plus, X } from "lucide-react";
import { useState } from "react";
import type { JsonValue } from "@/types/config.js";

interface AddSettingFormProps {
  onAdd: (keyPath: string, value: JsonValue) => void;
  onCancel: () => void;
}

type ValueType = "string" | "number" | "boolean" | "json";

function parseValue(raw: string, type: ValueType): JsonValue {
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

export function AddSettingForm({ onAdd, onCancel }: AddSettingFormProps) {
  const [keyPath, setKeyPath] = useState("");
  const [rawValue, setRawValue] = useState("");
  const [valueType, setValueType] = useState<ValueType>("string");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    if (!keyPath.trim()) {
      setError("Key path is required");
      return;
    }
    try {
      const value = parseValue(rawValue, valueType);
      onAdd(keyPath.trim(), value);
    } catch {
      setError("Invalid value for selected type");
    }
  };

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">Add Setting</span>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded hover:bg-surface-2 text-text-muted"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <label
            htmlFor="setting-key-path"
            className="block text-xs font-medium text-text-secondary mb-1"
          >
            Key Path
          </label>
          <input
            id="setting-key-path"
            type="text"
            placeholder="Key path (e.g. permissions.allow)"
            value={keyPath}
            onChange={(e) => setKeyPath(e.target.value)}
            className="w-full bg-surface-0 border border-border-default rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="flex gap-2">
          <label htmlFor="setting-value-type" className="sr-only">
            Value Type
          </label>
          <select
            id="setting-value-type"
            value={valueType}
            onChange={(e) => setValueType(e.target.value as ValueType)}
            className="bg-surface-0 border border-border-default rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="json">JSON</option>
          </select>

          <label htmlFor="setting-value" className="sr-only">
            Value
          </label>
          {valueType === "boolean" ? (
            <select
              id="setting-value"
              value={rawValue}
              onChange={(e) => setRawValue(e.target.value)}
              className="flex-1 bg-surface-0 border border-border-default rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              id="setting-value"
              type={valueType === "number" ? "number" : "text"}
              placeholder="Value"
              value={rawValue}
              onChange={(e) => setRawValue(e.target.value)}
              className="flex-1 bg-surface-0 border border-border-default rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          )}
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add
      </button>
    </div>
  );
}
