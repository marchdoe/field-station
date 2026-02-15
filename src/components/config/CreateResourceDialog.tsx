import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ResourceType = "agent" | "command" | "skill";

interface FrontmatterField {
  key: string;
  label: string;
  required?: boolean;
}

const FRONTMATTER_FIELDS: Record<ResourceType, FrontmatterField[]> = {
  agent: [
    { key: "description", label: "Description" },
    { key: "tools", label: "Tools" },
  ],
  command: [],
  skill: [
    { key: "description", label: "Description" },
    { key: "allowed-tools", label: "Allowed Tools" },
  ],
};

const TYPE_LABELS: Record<ResourceType, string> = {
  agent: "Agent",
  command: "Command",
  skill: "Skill",
};

interface CreateResourceDialogProps {
  type: ResourceType;
  open: boolean;
  saving?: boolean;
  existingFolders?: string[];
  onCreate: (data: {
    name: string;
    folder?: string;
    frontmatter: Record<string, string>;
    body: string;
  }) => void;
  onClose: () => void;
}

export function CreateResourceDialog({
  type,
  open,
  saving,
  existingFolders,
  onCreate,
  onClose,
}: CreateResourceDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [folder, setFolder] = useState("");
  const [frontmatter, setFrontmatter] = useState<Record<string, string>>({});
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  const reset = () => {
    setName("");
    setFolder("");
    setFrontmatter({});
    setBody("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name.trim())) {
      setError("Name must contain only letters, numbers, hyphens, and underscores");
      return;
    }
    if (type === "command" && !folder.trim()) {
      setError("Folder is required for commands");
      return;
    }
    setError("");

    const fm: Record<string, string> = { ...frontmatter };
    if (type !== "command") {
      fm.name = name.trim();
    }

    onCreate({
      name: name.trim(),
      folder: type === "command" ? folder.trim() : undefined,
      frontmatter: fm,
      body,
    });
  };

  const fields = FRONTMATTER_FIELDS[type];

  return (
    <dialog
      ref={ref}
      onCancel={handleClose}
      className="m-auto backdrop:bg-black/50 bg-surface-1 rounded-xl border border-border-default p-0 w-full max-w-lg shadow-xl"
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">New {TYPE_LABELS[type]}</h2>
          <button
            onClick={handleClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

        <div>
          <label
            htmlFor="resource-name"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Name <span className="text-danger">*</span>
          </label>
          <input
            id="resource-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-resource"
            className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          />
          <p className="text-xs text-text-muted mt-1">Used as filename ({name || "name"}.md)</p>
        </div>

        {type === "command" && (
          <div>
            <label
              htmlFor="resource-folder"
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              Folder <span className="text-danger">*</span>
            </label>
            {existingFolders && existingFolders.length > 0 ? (
              <div className="space-y-2">
                <select
                  id="resource-folder"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                >
                  <option value="">Select or type a folder...</option>
                  {existingFolders.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  placeholder="Or enter a new folder name"
                  className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                />
              </div>
            ) : (
              <input
                id="resource-folder"
                type="text"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="folder-name"
                className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
            )}
          </div>
        )}

        {fields.map((field) => (
          <div key={field.key}>
            <label
              htmlFor={`create-${field.key}`}
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              {field.label}
            </label>
            <input
              id={`create-${field.key}`}
              type="text"
              value={frontmatter[field.key] ?? ""}
              onChange={(e) => setFrontmatter((prev) => ({ ...prev, [field.key]: e.target.value }))}
              className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            />
          </div>
        ))}

        <div>
          <label
            htmlFor="create-body"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Content
          </label>
          <textarea
            id="create-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder={`Write your ${TYPE_LABELS[type].toLowerCase()} content here...`}
            className="w-full rounded-xl border border-border-default bg-surface-0 px-4 py-3 text-sm text-text-primary font-mono focus:border-accent focus:outline-none resize-y"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={handleClose}
            disabled={saving}
            className="rounded-lg border border-border-default bg-surface-1 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {saving ? "Creating..." : `Create ${TYPE_LABELS[type]}`}
          </button>
        </div>
      </div>
    </dialog>
  );
}
