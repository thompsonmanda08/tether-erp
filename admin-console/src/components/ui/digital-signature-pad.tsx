"use client";

import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Check, Upload, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DigitalSignaturePadProps {
  onSignatureChange: (signature: string) => void;
  disabled?: boolean;
  className?: string;
  width?: number;
  height?: number;
}

export function DigitalSignaturePad({
  onSignatureChange,
  disabled = false,
  className,
  width = 400,
  height = 200,
}: DigitalSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"draw" | "upload">("draw");
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(
    null
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up canvas
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getEventPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      // Touch event
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      // Mouse event
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (disabled) return;

    e.preventDefault();
    setIsDrawing(true);
    const pos = getEventPos(e);
    setLastPoint(pos);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || disabled || !lastPoint) return;

    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const currentPos = getEventPos(e);

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    setLastPoint(currentPos);
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;

    setIsDrawing(false);
    setLastPoint(null);

    // Convert canvas to base64 and notify parent
    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      const signature = canvas.toDataURL("image/png");
      onSignatureChange(signature);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear uploaded image
    setUploadedImage(null);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setHasSignature(false);
    onSignatureChange("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, etc.)");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("File size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setUploadedImage(imageData);
      setHasSignature(true);
      onSignatureChange(imageData);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "draw" | "upload")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="draw" className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Draw Signature
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Image
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="mt-4">
          <div className="relative border-2 border-dashed border-border rounded-lg p-2 bg-background">
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className={cn(
                "block mx-auto cursor-crosshair touch-none",
                disabled && "cursor-not-allowed opacity-50"
              )}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />

            {!hasSignature && !disabled && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-muted-foreground text-sm">
                  Sign here with your mouse or finger
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <div className="relative border-2 border-dashed border-border rounded-lg p-4 bg-background">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={disabled}
              className="hidden"
            />

            {uploadedImage ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={uploadedImage}
                  alt="Uploaded signature"
                  className="max-h-[200px] max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Upload className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground text-sm text-center">
                  Upload your signature as an image
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={triggerFileUpload}
                  disabled={disabled}
                  className="mt-2"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  PNG, JPG, or GIF (max 2MB)
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
          disabled={disabled || !hasSignature}
          className="flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          Clear
        </Button>

        {hasSignature && (
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <Check className="h-3 w-3" />
            Signature captured
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Your signature will be securely stored and used for audit purposes.
      </p>
    </div>
  );
}
