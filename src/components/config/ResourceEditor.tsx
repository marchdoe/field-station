import { useState } from 'react'
import { Save, X } from 'lucide-react'

type ResourceType = 'agent' | 'command' | 'skill'

interface FrontmatterField {
  key: string
  label: string
  required?: boolean
}

const FRONTMATTER_FIELDS: Record<ResourceType, FrontmatterField[]> = {
  agent: [
    { key: 'name', label: 'Name', required: true },
    { key: 'description', label: 'Description' },
    { key: 'tools', label: 'Tools' },
    { key: 'color', label: 'Color' },
  ],
  command: [],
  skill: [
    { key: 'name', label: 'Name', required: true },
    { key: 'description', label: 'Description' },
    { key: 'allowed-tools', label: 'Allowed Tools' },
  ],
}

interface ResourceEditorProps {
  type: ResourceType
  frontmatter: Record<string, string>
  body: string
  saving?: boolean
  onSave: (frontmatter: Record<string, string>, body: string) => void
  onCancel: () => void
}

export function ResourceEditor({
  type,
  frontmatter: initialFrontmatter,
  body: initialBody,
  saving,
  onSave,
  onCancel,
}: ResourceEditorProps) {
  const fields = FRONTMATTER_FIELDS[type]
  const [frontmatter, setFrontmatter] = useState<Record<string, string>>({ ...initialFrontmatter })
  const [body, setBody] = useState(initialBody)

  const updateField = (key: string, value: string) => {
    setFrontmatter((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    onSave(frontmatter, body)
  }

  return (
    <div className="space-y-4">
      {fields.length > 0 && (
        <div className="space-y-3 rounded-xl border border-border-default bg-surface-1 p-4">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            Frontmatter
          </h3>
          {fields.map((field) => (
            <div key={field.key}>
              <label
                htmlFor={`field-${field.key}`}
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                {field.label}
                {field.required && <span className="text-danger ml-1">*</span>}
              </label>
              <input
                id={`field-${field.key}`}
                type="text"
                value={frontmatter[field.key] ?? ''}
                onChange={(e) => updateField(field.key, e.target.value)}
                className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="resource-body"
          className="block text-sm font-semibold text-text-secondary uppercase tracking-wide"
        >
          Content
        </label>
        <textarea
          id="resource-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={20}
          className="w-full rounded-xl border border-border-default bg-surface-0 px-4 py-3 text-sm text-text-primary font-mono focus:border-accent focus:outline-none resize-y"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-surface-1 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 disabled:opacity-50 transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  )
}
