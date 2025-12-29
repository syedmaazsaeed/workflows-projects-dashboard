'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Upload, CheckCircle2, XCircle } from 'lucide-react';

interface UploadProgressProps {
  progress: number;
  fileName?: string;
  error?: string;
  className?: string;
}

export function UploadProgress({ progress, fileName, error, className }: UploadProgressProps) {
  if (error) {
    return (
      <div className={cn('flex items-center gap-3 p-4 rounded-lg border border-destructive bg-destructive/10', className)}>
        <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">Upload failed</p>
          <p className="text-xs text-destructive/80 truncate">{error}</p>
        </div>
      </div>
    );
  }

  if (progress >= 100) {
    return (
      <div className={cn('flex items-center gap-3 p-4 rounded-lg border border-green-500/20 bg-green-500/10', className)}>
        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-600">Upload complete</p>
          {fileName && <p className="text-xs text-muted-foreground truncate">{fileName}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2 p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-center gap-3">
        <Upload className="h-5 w-5 text-primary animate-pulse" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Uploading...</p>
          {fileName && <p className="text-xs text-muted-foreground truncate">{fileName}</p>}
        </div>
        <span className="text-sm font-medium text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}

