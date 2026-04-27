"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadToImageKit, validateImageFile } from "@/lib/imagekit";
import { cn } from "@/lib/utils";

interface OrganizationLogoUploadProps {
  currentLogoUrl?: string;
  organizationName: string;
  onLogoChange: (url: string) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  showDropZone?: boolean; // Optional large drop zone for initial uploads
}

export function OrganizationLogoUpload({
  currentLogoUrl,
  organizationName,
  onLogoChange,
  disabled = false,
  size = "md",
  showDropZone = false, // Default to compact view
}: OrganizationLogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const response = await uploadToImageKit(
        file,
        "organizations",
        (progress) => {
          setUploadProgress(progress);
        },
      );

      toast.success("Logo uploaded successfully");
      onLogoChange(response.url);
      setPreviewUrl(null);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload logo. Please try again.");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveLogo = () => {
    onLogoChange("");
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.success("Logo removed");
  };

  const displayUrl = previewUrl || currentLogoUrl;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {/* Logo Preview */}
        <div className="relative">
          <Avatar className={cn("rounded-lg", sizeClasses[size])}>
            <AvatarImage src={displayUrl} alt={organizationName} />
            <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
              <span className="text-2xl">{getInitials(organizationName)}</span>
            </AvatarFallback>
          </Avatar>

          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <div className="text-center text-white">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1" />
                <span className="text-xs">{uploadProgress}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || disabled}
            >
              <Upload className="h-4 w-4 mr-2" />
              {currentLogoUrl ? "Change" : "Upload"}
            </Button>

            {currentLogoUrl && !uploading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveLogo}
                disabled={disabled}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            JPG, PNG, GIF or WebP. Max 10MB.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          disabled={uploading || disabled}
          className="hidden"
        />
      </div>

      {/* Drag and Drop Zone (Optional - only shown when showDropZone is true) */}
      {showDropZone && !currentLogoUrl && !uploading && (
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            disabled && "opacity-50 cursor-not-allowed",
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <div className="space-y-2">
            <div className="mx-auto h-12 w-12 text-muted-foreground">
              <ImageIcon className="h-full w-full" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Drop your logo here, or{" "}
                <span className="text-primary">browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports: JPG, PNG, GIF, WebP (max 10MB)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
