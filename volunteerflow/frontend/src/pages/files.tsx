import { useState, useMemo, useEffect, useRef } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { api } from '@/lib/api';
import {
  Folder,
  FileText,
  Image,
  File,
  Upload,
  Download,
  Trash2,
  Search,
  Plus,
  X,
  Check,
  FolderPlus,
  AlertCircle,
  Link2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type FileType = 'pdf' | 'doc' | 'image' | 'csv' | 'other';

interface LibraryFile {
  id: string;
  name: string;
  type: FileType;
  size: string;
  folderId: string | null;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
}

interface LibraryFolder {
  id: string;
  name: string;
  color: string;
}

interface ApiFile {
  id: string;
  name: string;
  type: string;
  size: string;
  folderId: string | null;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface ApiFolder {
  id: string;
  name: string;
  color: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FOLDER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileIcon(type: FileType) {
  const cls = 'w-5 h-5';
  switch (type) {
    case 'pdf':   return <FileText className={`${cls} text-danger-500`} />;
    case 'doc':   return <FileText className={`${cls} text-primary-500`} />;
    case 'image': return <Image className={`${cls} text-violet-500`} />;
    case 'csv':   return <FileText className={`${cls} text-success-500`} />;
    default:      return <File className={`${cls} text-neutral-400`} />;
  }
}

function fileTypeBg(type: FileType) {
  switch (type) {
    case 'pdf':   return 'bg-danger-50 dark:bg-danger-900/20';
    case 'doc':   return 'bg-primary-50 dark:bg-primary-900/20';
    case 'image': return 'bg-violet-50 dark:bg-violet-900/20';
    case 'csv':   return 'bg-success-50 dark:bg-success-900/20';
    default:      return 'bg-neutral-100 dark:bg-neutral-800';
  }
}

function guessType(name: string): FileType {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (ext === 'csv') return 'csv';
  return 'other';
}

function mapApiFile(f: ApiFile): LibraryFile {
  return {
    id: f.id,
    name: f.name,
    type: guessType(f.name),
    size: f.size,
    folderId: f.folderId ?? null,
    url: f.url ?? '',
    uploadedBy: f.uploadedBy,
    uploadedAt: f.uploadedAt,
  };
}

// ─── New Folder Modal ─────────────────────────────────────────────────────────

function FolderModal({ onSave, onClose }: { onSave: (name: string, color: string) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(FOLDER_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), color);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">New Folder</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Folder name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Legal Documents"
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">Color</label>
            <div className="flex gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ background: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving} className="flex-1">
            {saving ? 'Creating…' : 'Create folder'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Add File Modal ───────────────────────────────────────────────────────────

type AddMode = 'upload' | 'url';

function AddFileModal({
  folders,
  defaultFolderId,
  onUploadFile,
  onAddUrl,
  onClose,
}: {
  folders: LibraryFolder[];
  defaultFolderId: string;
  onUploadFile: (file: File, name: string, folderId: string) => Promise<void>;
  onAddUrl: (name: string, url: string, folderId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<AddMode>('upload');
  const [folderId, setFolderId] = useState(defaultFolderId || '');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File) => {
    setPickedFile(f);
    if (!name) setName(f.name);
    setError('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  };

  const canSubmit = mode === 'upload'
    ? pickedFile !== null && name.trim() !== ''
    : name.trim() !== '';

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    // Fake progress tick so the user sees activity
    const ticker = setInterval(() => setProgress((p) => Math.min(p + 10, 85)), 200);
    try {
      if (mode === 'upload' && pickedFile) {
        await onUploadFile(pickedFile, name.trim(), folderId);
      } else {
        await onAddUrl(name.trim(), url.trim(), folderId);
      }
      setProgress(100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add file.');
    } finally {
      clearInterval(ticker);
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Add File</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 p-4 pb-0">
          {(['upload', 'url'] as AddMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                mode === m
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              {m === 'upload' ? <Upload className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
              {m === 'upload' ? 'Upload file' : 'Use URL'}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {mode === 'upload' ? (
            <>
              {/* Drop zone */}
              {!pickedFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    dragging
                      ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700'
                  }`}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-600" />
                  <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Drop a file here or click to browse</p>
                  <p className="text-xs text-neutral-400 mt-1">PDF, Word, images, CSV — up to 50 MB</p>
                  <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.csv,.xls,.xlsx,.txt"
                    onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{pickedFile.name}</p>
                    <p className="text-xs text-neutral-400">{(pickedFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={() => { setPickedFile(null); setName(''); }} className="text-neutral-400 hover:text-danger-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Upload progress bar */}
              {saving && (
                <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </>
          ) : (
            /* URL mode */
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                File URL <span className="text-neutral-400 font-normal">(Google Drive, Dropbox, etc.)</span>
              </label>
              <div className="relative">
                <Link2 className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                <input
                  autoFocus
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://drive.google.com/…"
                  className={`${inputCls} pl-9`}
                />
              </div>
              <p className="text-xs text-neutral-400 mt-1">Leave blank to track the file without a download link.</p>
            </div>
          )}

          {/* File name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Display name <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Volunteer Liability Waiver.pdf"
              className={inputCls}
            />
          </div>

          {/* Folder */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Folder</label>
            <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className={inputCls}>
              <option value="">No folder</option>
              {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          {error && (
            <p className="text-xs text-danger-600 dark:text-danger-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving} className="flex-1 flex items-center justify-center gap-2">
            {saving
              ? (mode === 'upload' ? 'Uploading…' : 'Adding…')
              : (mode === 'upload' ? <><Upload className="w-4 h-4" /> Upload</> : 'Add file')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FilesPage() {
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get<ApiFolder[]>('/folders'),
      api.get<ApiFile[]>('/files'),
    ])
      .then(([folderData, fileData]) => {
        if (!cancelled) {
          setFolders(folderData);
          setFiles(fileData.map(mapApiFile));
          setUsingMockData(false);
        }
      })
      .catch(() => {
        if (!cancelled) setUsingMockData(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Derived state ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return files.filter((f) => {
      if (selectedFolder && f.folderId !== selectedFolder) return false;
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [files, selectedFolder, search]);

  const folderCounts = useMemo(() => {
    const map: Record<string, number> = {};
    files.forEach((f) => { if (f.folderId) map[f.folderId] = (map[f.folderId] || 0) + 1; });
    return map;
  }, [files]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const createFolder = async (name: string, color: string) => {
    const folder = await api.post<ApiFolder>('/folders', { name, color });
    setFolders((p) => [...p, folder]);
    setShowFolderModal(false);
    showToast('Folder created');
  };

  const deleteFolder = async (id: string) => {
    try {
      await api.delete(`/folders/${id}`);
      setFolders((p) => p.filter((f) => f.id !== id));
      setFiles((p) => p.map((f) => f.folderId === id ? { ...f, folderId: null } : f));
      if (selectedFolder === id) setSelectedFolder('');
      showToast('Folder deleted');
    } catch {
      showToast('Failed to delete folder');
    }
  };

  const uploadFile = async (rawFile: File, name: string, folderId: string) => {
    const formData = new FormData();
    formData.append('file', rawFile);
    formData.append('name', name);
    if (folderId) formData.append('folderId', folderId);
    formData.append('uploadedBy', 'You');
    const file = await api.upload<ApiFile>('/files', formData);
    setFiles((p) => [mapApiFile(file), ...p]);
    setShowAddFileModal(false);
    showToast('File uploaded');
  };

  const addFileByUrl = async (name: string, url: string, folderId: string) => {
    const file = await api.post<ApiFile>('/files', {
      name,
      type: guessType(name),
      size: '',
      folderId: folderId || null,
      url,
      uploadedBy: 'You',
    });
    setFiles((p) => [mapApiFile(file), ...p]);
    setShowAddFileModal(false);
    showToast('File added');
  };

  const deleteFile = async (id: string) => {
    try {
      await api.delete(`/files/${id}`);
      setFiles((p) => p.filter((f) => f.id !== id));
      showToast('File deleted');
    } catch {
      showToast('Failed to delete file');
    }
  };

  const downloadFile = (file: LibraryFile) => {
    if (file.url) {
      window.open(file.url, '_blank', 'noopener,noreferrer');
    } else {
      showToast('No download URL stored for this file');
    }
  };

  const currentFolder = folders.find((f) => f.id === selectedFolder);

  return (
    <Layout>
      <Head><title>Files — VolunteerFlow</title></Head>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">File Library</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Store and share waivers, training materials, and event documents with your team.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setShowFolderModal(true)} className="flex items-center gap-2 text-sm">
              <FolderPlus className="w-4 h-4" /> New folder
            </Button>
            <Button onClick={() => setShowAddFileModal(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add file
            </Button>
          </div>
        </div>

        {/* Offline banner */}
        {usingMockData && (
          <div className="flex items-center gap-2 px-4 py-2.5 mb-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700 rounded-lg text-sm text-warning-700 dark:text-warning-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Backend unavailable — changes will not be saved.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar: folders */}
          <div className="lg:col-span-1 space-y-2">
            <button
              onClick={() => setSelectedFolder('')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                !selectedFolder
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <Folder className="w-4 h-4" />
              All files
              <span className="ml-auto text-xs font-bold text-neutral-400">{files.length}</span>
            </button>

            {loading ? (
              <div className="space-y-1 pt-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2 space-y-1">
                {folders.map((folder) => (
                  <div key={folder.id} className="group relative">
                    <button
                      onClick={() => setSelectedFolder(folder.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        selectedFolder === folder.id
                          ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                          : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Folder className="w-4 h-4 flex-shrink-0" style={{ color: folder.color }} />
                      <span className="flex-1 text-left truncate">{folder.name}</span>
                      <span className="text-xs text-neutral-400">{folderCounts[folder.id] || 0}</span>
                    </button>
                    <button
                      onClick={() => deleteFolder(folder.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-danger-50 dark:hover:bg-danger-900/20 text-neutral-400 hover:text-danger-500 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {folders.length === 0 && !loading && (
                  <p className="text-xs text-neutral-400 px-3 py-2">No folders yet</p>
                )}
              </div>
            )}

            {/* File count summary */}
            <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">Library</p>
              <p className="text-xs text-neutral-900 dark:text-neutral-100">
                <span className="font-bold">{files.length}</span> file{files.length !== 1 ? 's' : ''} across{' '}
                <span className="font-bold">{folders.length}</span> folder{folders.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Main: file list */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search files…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {currentFolder && (
                <div className="flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                  <Folder className="w-4 h-4" style={{ color: currentFolder.color }} />
                  <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{currentFolder.name}</span>
                  <button onClick={() => setSelectedFolder('')} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-500 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl">
                <File className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">{files.length === 0 ? 'No files yet' : 'No files match your search'}</p>
                <p className="text-xs mt-1">Add a file link to get started</p>
                <Button onClick={() => setShowAddFileModal(true)} variant="secondary" className="mt-4 flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Add file
                </Button>
              </div>
            ) : (
              <Card className="overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400 hidden sm:table-cell">Folder</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400 hidden md:table-cell">Added</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((file) => {
                      const folder = folders.find((f) => f.id === file.folderId);
                      return (
                        <tr key={file.id} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${fileTypeBg(file.type)}`}>
                                {fileIcon(file.type)}
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate max-w-[200px] block">{file.name}</span>
                                {!file.url && (
                                  <span className="text-xs text-neutral-400">No download URL</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {folder ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: folder.color }} />
                                {folder.name}
                              </span>
                            ) : (
                              <span className="text-xs text-neutral-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-xs text-neutral-500 dark:text-neutral-400">
                            {file.uploadedAt} · {file.uploadedBy}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => downloadFile(file)}
                                disabled={!file.url}
                                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title={file.url ? 'Open file' : 'No URL stored'}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteFile(file.id)}
                                className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-neutral-400 hover:text-danger-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800">
                  <p className="text-xs text-neutral-400">{filtered.length} file{filtered.length !== 1 ? 's' : ''}</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {showFolderModal && <FolderModal onSave={createFolder} onClose={() => setShowFolderModal(false)} />}
      {showAddFileModal && (
        <AddFileModal
          folders={folders}
          defaultFolderId={selectedFolder}
          onUploadFile={uploadFile}
          onAddUrl={addFileByUrl}
          onClose={() => setShowAddFileModal(false)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-semibold rounded-xl shadow-2xl">
          <Check className="w-4 h-4 text-success-400 dark:text-success-600" />
          {toast}
        </div>
      )}
    </Layout>
  );
}
