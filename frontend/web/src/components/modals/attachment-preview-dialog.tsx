"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Loader from "../ui/loader";
import { RequisitionAttachment } from "@/types/requisition";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface AttachmentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachment: RequisitionAttachment | null;
  attachments: RequisitionAttachment[];
}

export function AttachmentPreviewDialog({
  open,
  onOpenChange,
  attachment,
  attachments,
}: AttachmentPreviewDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  const current = attachments[currentIndex] || attachment;
  const isPDF = current?.mimeType === "application/pdf";
  const isImage = current?.mimeType?.startsWith("image/");

  // Sync currentIndex when attachment prop changes
  useEffect(() => {
    if (attachment && open) {
      const idx = attachments.findIndex((a) => a.fileId === attachment.fileId);
      setCurrentIndex(idx >= 0 ? idx : 0);
      setPageNumber(1);
      setScale(1.0);
      setLoadError(null);
      setNumPages(0);
      setImageLoading(true);
    }
  }, [attachment, open, attachments]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setLoadError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("PDF load error:", error);
    setLoadError(`Failed to load PDF: ${error.message}`);
  };

  const handlePrevPage = () => setPageNumber((p) => Math.max(1, p - 1));
  const handleNextPage = () => setPageNumber((p) => Math.min(numPages, p + 1));
  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 2.5));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.3));

  const handlePrevAttachment = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
    setPageNumber(1);
    setScale(1.0);
    setLoadError(null);
    setNumPages(0);
    setImageLoading(true);
  };

  const handleNextAttachment = () => {
    setCurrentIndex((i) => Math.min(attachments.length - 1, i + 1));
    setPageNumber(1);
    setScale(1.0);
    setLoadError(null);
    setNumPages(0);
    setImageLoading(true);
  };

  const handleDownload = () => {
    if (!current) return;
    const link = document.createElement("a");
    link.href = current.fileUrl;
    link.download = current.fileName;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[90vh] max-h-[90vh] min-w-5xl max-w-5xl gap-0 p-0">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            {isPDF ? (
              <FileText className="h-5 w-5 text-red-500 shrink-0" />
            ) : (
              <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" />
            )}
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold truncate">
                {current.fileName}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {formatBytes(current.fileSize)} &middot;{" "}
                {attachments.length > 1
                  ? `${currentIndex + 1} of ${attachments.length}`
                  : isPDF
                    ? "PDF Document"
                    : "Image"}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-muted flex items-center justify-center">
          {isPDF && (
            <>
              {loadError ? (
                <div className="max-w-md rounded-lg bg-destructive/10 p-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
                    <X className="h-6 w-6 text-destructive" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-destructive">
                    Preview Failed
                  </h3>
                  <p className="text-sm text-destructive/80">{loadError}</p>
                </div>
              ) : (
                <div className="flex justify-center p-4">
                  <Document
                    file={current.fileUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="flex h-96 items-center justify-center">
                        <Loader loadingText="Loading PDF..." />
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="shadow-lg"
                    />
                  </Document>
                </div>
              )}
            </>
          )}

          {isImage && (
            <div className="flex items-center justify-center p-4 w-full h-full">
              {imageLoading && (
                <div className="absolute">
                  <Loader loadingText="Loading image..." />
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.fileUrl}
                alt={current.fileName}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                style={{ transform: `scale(${scale})`, transition: "transform 0.2s" }}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setLoadError("Failed to load image");
                }}
              />
            </div>
          )}

          {!isPDF && !isImage && (
            <div className="text-center p-8">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Preview not available for this file type
              </p>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download File
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center w-full justify-between p-4 border-t">
          <div className="flex items-center gap-2 w-full">
            {/* Attachment navigation */}
            {attachments.length > 1 && (
              <div className="flex items-center gap-1 rounded-lg border bg-background">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevAttachment}
                  disabled={currentIndex <= 0}
                  className="h-8 w-8 rounded-r-none"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 text-sm text-muted-foreground whitespace-nowrap">
                  {currentIndex + 1} / {attachments.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextAttachment}
                  disabled={currentIndex >= attachments.length - 1}
                  className="h-8 w-8 rounded-l-none"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Zoom controls */}
            {(isPDF || isImage) && (
              <div className="flex items-center gap-1 rounded-lg border bg-background">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={zoomOut}
                  disabled={scale <= 0.3}
                  className="h-8 w-8 rounded-r-none"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="px-2 text-sm text-muted-foreground">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={zoomIn}
                  disabled={scale >= 2.5}
                  className="h-8 w-8 rounded-l-none"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* PDF page navigation */}
            {isPDF && numPages > 1 && (
              <div className="flex items-center gap-1 rounded-lg border bg-background">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevPage}
                  disabled={pageNumber <= 1}
                  className="h-8 w-8 rounded-r-none"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 text-sm text-muted-foreground whitespace-nowrap">
                  Page {pageNumber} / {numPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextPage}
                  disabled={pageNumber >= numPages}
                  className="h-8 w-8 rounded-l-none"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              {/* Open in new tab */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open(current.fileUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
                Open
              </Button>

              {/* Download */}
              <Button size="sm" className="gap-2" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
