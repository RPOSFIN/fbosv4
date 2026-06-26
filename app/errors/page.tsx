"use client";

import { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export default function ErrorChecklistPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = [
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];

  const acceptedExtensions = ['.pdf', '.csv', '.xls', '.xlsx', '.txt'];

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }

  async function handleFiles(fileList: FileList) {
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const isValid = acceptedTypes.includes(file.type) || 
                     acceptedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (!isValid) {
        newFiles.push({
          id: `${Date.now()}-${i}`,
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'error',
          error: 'Unsupported file type',
        });
        continue;
      }

      const fileId = `${Date.now()}-${i}`;
      newFiles.push({
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
      });

      // Upload file
      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/error-checklist/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          setFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, status: 'success' } : f
          ));
        } else {
          throw new Error('Upload failed');
        }
      } catch (err) {
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'error', error: String(err) } : f
        ));
      }
    }

    setFiles(prev => [...prev, ...newFiles]);
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="w-7 h-7" />
          Error Checklist Upload
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload error checklists in PDF, CSV, Excel, or TXT format
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-12 border-2 border-dashed rounded-lg text-center cursor-pointer transition ${
          dragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
        }`}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
        <p className="text-lg font-medium mb-2">
          Drag & drop files here or click to browse
        </p>
        <p className="text-sm text-slate-400">
          Supported: PDF, CSV, Excel (.xls, .xlsx), TXT
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedExtensions.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* Uploaded Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Uploaded Files</h2>
          {files.map((file) => (
            <div
              key={file.id}
              className="p-4 border border-slate-700 rounded-lg bg-slate-900/50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1">
                <FileText className="w-5 h-5 text-slate-400" />
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {file.status === 'uploading' && (
                  <span className="text-sm text-blue-400">Uploading...</span>
                )}
                {file.status === 'success' && (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                )}
                {file.status === 'error' && (
                  <span className="text-sm text-red-400">{file.error || 'Error'}</span>
                )}
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 text-slate-400 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}