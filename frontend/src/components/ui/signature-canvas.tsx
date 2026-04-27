'use client';

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface SignatureCanvasProps {
  onSignatureChange?: (signature: string) => void;
  width?: number;
  height?: number;
  className?: string;
  disabled?: boolean;
}

export interface SignatureCanvasHandle {
  clearSignature: () => void;
}

export const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(({
  onSignatureChange,
  width = 400,
  height = 200,
  className = '',
  disabled = false,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const clearSignature = () => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onSignatureChange?.('');
  };

  useImperativeHandle(ref, () => ({
    clearSignature,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing || disabled) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert to base64 and notify parent
    const signature = canvas.toDataURL();
    onSignatureChange?.(signature);
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Digital Signature
        </div>
        <div className={`border border-border rounded-md ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className={disabled ? 'cursor-not-allowed' : 'cursor-crosshair'}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSignature}
            disabled={isEmpty || disabled}
          >
            Clear
          </Button>
          <div className="text-xs text-muted-foreground">
            Sign above to provide your digital signature
          </div>
        </div>
      </div>
    </Card>
  );
});

SignatureCanvas.displayName = 'SignatureCanvas';

export default SignatureCanvas;