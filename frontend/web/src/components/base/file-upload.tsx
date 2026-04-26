"use client";
import { ChangeEvent, FC, InputHTMLAttributes, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  Camera,
  CheckCircleIcon,
  FileText,
  UploadCloud,
  XCircleIcon,
} from "lucide-react";

export type FileUploadProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  fileName?: string;
  accept?: string;
  maxFileSize?: number; // in MB
  id?: string;
  onError?: boolean;
  resetOnChange?: boolean;
  onFileChange?: (file: File | null) => void;
  /** Render a compact two-column layout (icon left, text right) */
  compact?: boolean;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseExtensions(accept?: string): string[] {
  if (!accept) return [".pdf", ".png", ".jpg", ".jpeg"];
  return accept
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.startsWith("."));
}

function formatAcceptHint(accept?: string): string {
  return parseExtensions(accept)
    .map((e) => e.replace(".", "").toUpperCase())
    .join(", ");
}

function getFileType(fileName: string) {
  const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
  if (ext === ".pdf")
    return {
      icon: FileText,
      color: "text-red-500",
      bg: "bg-red-50",
      label: "PDF",
    };
  return {
    icon: Camera,
    color: "text-blue-500",
    bg: "bg-blue-50",
    label: ext.replace(".", "").toUpperCase(),
  };
}

const FileUpload: FC<FileUploadProps> = ({
  fileName,
  label = "Upload File",
  required,
  onError,
  id,
  accept,
  maxFileSize,
  onFileChange,
  resetOnChange,
  compact = false,
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const MAX_BYTES = (maxFileSize ?? 2) * 1024 * 1024;

  const activeFileName = selectedFile?.name || fileName;
  const allowedExts = parseExtensions(accept);
  const hasError = !!(fileError || (required && onError));

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BYTES) {
      setFileError(`File exceeds the ${maxFileSize ?? 2}MB size limit.`);
      setSelectedFile(null);
      onFileChange?.(null);
      if (resetOnChange) event.target.value = "";
      return;
    }

    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExts.includes(ext)) {
      setFileError(`Allowed formats: ${formatAcceptHint(accept)}`);
      setSelectedFile(null);
      onFileChange?.(null);
      return;
    }

    setFileError(null);
    setSelectedFile(file);
    onFileChange?.(file);
    if (resetOnChange) event.target.value = "";
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFile(null);
    setFileError(null);
    onFileChange?.(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const fileType = activeFileName ? getFileType(activeFileName) : null;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label */}
      <p className="text-foreground/60 font-medium tracking-wide text-sm">
        {label}
        {required && <span className="text-danger font-bold ml-0.5">*</span>}
      </p>

      {/* Hidden input */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        className="hidden"
        name={id}
        {...props}
        accept={accept}
        onChange={handleFileChange}
      />

      {/* ── Uploaded state ── */}
      {activeFileName && fileType ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 transition-all">
          <div
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg shrink-0",
              fileType.bg,
            )}
          >
            <fileType.icon className={cn("w-5 h-5", fileType.color)} />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium text-foreground truncate">
              {activeFileName}
            </span>
            <span className="text-xs text-foreground/50">
              {fileType.label}
              {selectedFile && ` · ${formatFileSize(selectedFile.size)}`}
            </span>
          </div>
          <CheckCircleIcon className="w-5 h-5 text-success shrink-0" />
          <label
            htmlFor={id}
            className="text-xs text-primary font-medium cursor-pointer hover:underline shrink-0"
          >
            Change
          </label>
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 text-foreground/30 hover:text-danger transition-colors"
          >
            <XCircleIcon className="w-5 h-5" />
          </button>
        </div>
      ) : compact ? (
        /* ── Compact empty state: 2-col ── */
        <label
          htmlFor={id}
          className={cn(
            "flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 cursor-pointer transition-all",
            "hover:border-primary/60 hover:bg-primary/5",
            hasError ? "border-danger/50 bg-danger/5" : "border-neutral-300",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg shrink-0",
              hasError ? "bg-danger/10" : "bg-primary/10",
            )}
          >
            <UploadCloud
              className={cn(
                "w-5 h-5",
                hasError ? "text-danger" : "text-primary",
              )}
            />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-foreground/70">
              Click to upload
            </span>
            <span className="text-xs text-foreground/40">
              {formatAcceptHint(accept)} · max {maxFileSize ?? 2}MB
            </span>
          </div>
        </label>
      ) : (
        /* ── Default empty state: centered drop zone ── */
        <label
          htmlFor={id}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-all",
            "hover:border-primary/60 hover:bg-primary/5",
            hasError ? "border-danger/50 bg-danger/5" : "border-neutral-300",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full",
              hasError ? "bg-danger/10" : "bg-primary/10",
            )}
          >
            <UploadCloud
              className={cn(
                "w-5 h-5",
                hasError ? "text-danger" : "text-primary",
              )}
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground/70">
              Click to upload
            </p>
            <p className="text-xs text-foreground/40 mt-0.5">
              {formatAcceptHint(accept)} · max {maxFileSize ?? 2}MB
            </p>
          </div>
        </label>
      )}

      {/* Error messages */}
      {fileError && (
        <p className="text-xs font-medium text-danger">{fileError}</p>
      )}
      {!fileError && required && onError && (
        <p className="text-xs font-medium text-danger">
          This file upload is required
        </p>
      )}
    </div>
  );
};

export default FileUpload;
