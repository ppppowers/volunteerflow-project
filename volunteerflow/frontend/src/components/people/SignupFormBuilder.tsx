'use client';

import { useState } from 'react';
import Button from '@/components/Button';
import {
  X,
  GripVertical,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  Settings2,
  ExternalLink,
} from 'lucide-react';
import {
  signupFormConfigs,
  getFormConfig,
  type FormField,
  type FieldType,
  type FormFieldOption,
} from '@/lib/signupForms';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500';

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  email: 'Email',
  tel: 'Phone',
  textarea: 'Long Text',
  select: 'Dropdown',
  checkbox: 'Checkbox',
  date: 'Date',
  image: 'Profile Photo',
  password: 'Password',
};

let _nextId = 1000;
const uid = () => `f${_nextId++}`;

// ─── AddFieldPanel ─────────────────────────────────────────────────────────────

interface AddFieldPanelProps {
  onAdd: (field: FormField) => void;
  onCancel: () => void;
}

function AddFieldPanel({ onAdd, onCancel }: AddFieldPanelProps) {
  const [type, setType] = useState<FieldType>('text');
  const [label, setLabel] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [required, setRequired] = useState(false);
  const [optionsRaw, setOptionsRaw] = useState(''); // comma-separated label:value pairs

  const handleAdd = () => {
    if (!label.trim()) return;
    const options: FormFieldOption[] | undefined =
      type === 'select'
        ? optionsRaw
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => {
              const [val, ...rest] = s.split(':');
              return { value: val.trim(), label: (rest.join(':') || val).trim() };
            })
        : undefined;
    onAdd({
      id: uid(),
      type,
      label: label.trim(),
      placeholder: placeholder.trim() || undefined,
      required,
      enabled: true,
      options,
    });
  };

  return (
    <div className="mt-4 p-4 border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 rounded-xl space-y-3">
      <p className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wide">New Field</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as FieldType)} className={inputCls}>
            {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
              <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
            Label <span className="text-danger-500">*</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Field label"
            className={inputCls}
          />
        </div>
        {type !== 'checkbox' && type !== 'select' && (
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Placeholder</label>
            <input
              type="text"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="Hint text shown inside the field"
              className={inputCls}
            />
          </div>
        )}
        {type === 'select' && (
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Options <span className="text-neutral-400 font-normal">(one per line, format: value:Label)</span>
            </label>
            <textarea
              value={optionsRaw}
              onChange={(e) => setOptionsRaw(e.target.value)}
              placeholder={"standard:Standard\npremium:Premium"}
              rows={3}
              className={inputCls + ' resize-none font-mono text-xs'}
            />
          </div>
        )}
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="add-required"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 text-primary-600"
          />
          <label htmlFor="add-required" className="text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer">
            Required field
          </label>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button onClick={handleAdd} disabled={!label.trim()}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Field
        </Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── FieldRow ─────────────────────────────────────────────────────────────────

interface FieldRowProps {
  field: FormField;
  index: number;
  total: number;
  onChange: (updated: FormField) => void;
  onDelete: () => void;
  onMove: (dir: 'up' | 'down') => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: () => void;
  onDragOver?: () => void;
  onDrop?: () => void;
}

function FieldRow({ field, index, total, onChange, onDelete, onMove, isDragging, isDragOver, onDragStart, onDragOver, onDrop }: FieldRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(); }}
      onDrop={(e) => { e.preventDefault(); onDrop?.(); }}
      onDragEnd={() => onDrop?.()}
      className={`border rounded-xl transition-all ${
        isDragging ? 'opacity-40 scale-95' : ''
      } ${
        isDragOver ? 'ring-2 ring-primary-400 dark:ring-primary-500' : ''
      } ${
        field.enabled
          ? 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'
          : 'border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 opacity-60'
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag handle */}
        <span title="Drag to reorder" className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-neutral-300 dark:text-neutral-600 flex-shrink-0" />
        </span>

        {/* Enabled toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={field.enabled}
          onClick={() => onChange({ ...field, enabled: !field.enabled })}
          title={field.enabled ? 'Disable field' : 'Enable field'}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
            field.enabled ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-600'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
              field.enabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>

        {/* Label + type */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate">
            {field.label}
          </span>
          <span className="ml-2 text-xs text-neutral-400 dark:text-neutral-500">
            {FIELD_TYPE_LABELS[field.type]}
            {field.required && <span className="text-danger-500 ml-1">*</span>}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => onMove('up')}
            disabled={index === 0}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 disabled:opacity-30 transition-colors"
            title="Move up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMove('down')}
            disabled={index === total - 1}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 disabled:opacity-30 transition-colors"
            title="Move down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 transition-colors"
            title="Edit field"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors"
            title="Delete field"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded edit area */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-neutral-100 dark:border-neutral-700 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Label</label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => onChange({ ...field, label: e.target.value })}
                className={inputCls}
              />
            </div>
            {field.type !== 'checkbox' && field.type !== 'select' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Placeholder</label>
                <input
                  type="text"
                  value={field.placeholder ?? ''}
                  onChange={(e) => onChange({ ...field, placeholder: e.target.value || undefined })}
                  className={inputCls}
                />
              </div>
            )}
          </div>
          {field.type === 'select' && field.options && (
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Options <span className="text-neutral-400 font-normal">(one per line: value:Label)</span>
              </label>
              <textarea
                value={field.options.map((o) => `${o.value}:${o.label}`).join('\n')}
                onChange={(e) => {
                  const opts: FormFieldOption[] = e.target.value
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((s) => {
                      const [val, ...rest] = s.split(':');
                      return { value: val.trim(), label: (rest.join(':') || val).trim() };
                    });
                  onChange({ ...field, options: opts });
                }}
                rows={3}
                className={inputCls + ' resize-none font-mono text-xs'}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`req-${field.id}`}
              checked={field.required}
              onChange={(e) => onChange({ ...field, required: e.target.checked })}
              className="w-4 h-4 rounded border-neutral-300 text-primary-600"
            />
            <label htmlFor={`req-${field.id}`} className="text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer">
              Required
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SignupFormBuilder ────────────────────────────────────────────────────────

export interface SignupFormBuilderProps {
  type: string;
  label?: string;
  onClose: () => void;
}

export function SignupFormBuilder({ type, label, onClose }: SignupFormBuilderProps) {
  const config = getFormConfig(type, label);

  const [title, setTitle] = useState(config.title);
  const [description, setDescription] = useState(config.description);
  const [submitLabel, setSubmitLabel] = useState(config.submitLabel);
  const [fields, setFields] = useState<FormField[]>([...config.fields]);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const updateField = (index: number, updated: FormField) => {
    setFields((prev) => prev.map((f, i) => (i === index ? updated : f)));
  };

  const deleteField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const moveField = (index: number, dir: 'up' | 'down') => {
    setFields((prev) => {
      const next = [...prev];
      const target = dir === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return next;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const reorderField = (fromId: string, toId: string) => {
    setFields((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((f) => f.id === fromId);
      const toIdx   = next.findIndex((f) => f.id === toId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const addField = (field: FormField) => {
    setFields((prev) => [...prev, field]);
    setShowAddPanel(false);
  };

  const handleSave = () => {
    const updated = { ...config, title, description, submitLabel, fields };
    // Persist to localStorage so /apply picks it up in any tab
    try {
      const stored = JSON.parse(localStorage.getItem('vf_signup_form_configs') ?? '{}');
      stored[type] = updated;
      localStorage.setItem('vf_signup_form_configs', JSON.stringify(stored));
    } catch { /* ignore */ }
    // Also update in-memory singleton for same-tab reads
    signupFormConfigs[type] = updated;
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const previewUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/apply?type=${type}&from=admin`
      : `/apply?type=${type}&from=admin`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-2xl my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-700">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Customize {label ?? (type.charAt(0).toUpperCase() + type.slice(1))} Form
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Changes apply to the public signup form at <code>/apply?type={type}</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Form metadata */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Form Details</p>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Form Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className={inputCls + ' resize-none'}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Submit Button Label</label>
              <input
                type="text"
                value={submitLabel}
                onChange={(e) => setSubmitLabel(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Fields list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                Fields <span className="ml-1 font-normal text-neutral-400">({fields.filter((f) => f.enabled).length} active)</span>
              </p>
              <button
                onClick={() => setShowAddPanel((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Field
              </button>
            </div>

            <div className="space-y-2">
              {fields.map((field, idx) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  index={idx}
                  total={fields.length}
                  onChange={(updated) => updateField(idx, updated)}
                  onDelete={() => deleteField(idx)}
                  onMove={(dir) => moveField(idx, dir)}
                  isDragging={dragId === field.id}
                  isDragOver={dragOverId === field.id}
                  onDragStart={() => setDragId(field.id)}
                  onDragOver={() => setDragOverId(field.id)}
                  onDrop={() => {
                    if (dragId && dragId !== field.id) reorderField(dragId, field.id);
                    setDragId(null);
                    setDragOverId(null);
                  }}
                />
              ))}
            </div>

            {showAddPanel && (
              <AddFieldPanel onAdd={addField} onCancel={() => setShowAddPanel(false)} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-neutral-200 dark:border-neutral-700">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saved}>
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SignupFormBuilder;
