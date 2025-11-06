"use client";

import { useCallback, useState } from "react";
import { Upload, X, FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";
import { UploadResponse } from "@/lib/types";

interface FileUploadProps {
  onUploadComplete: (data: UploadResponse) => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      setFileName(file.name);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append("file", file);

        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) return prev;
            return prev + 10;
          });
        }, 200);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const data: UploadResponse = await response.json();

        // Small delay to show completion
        await new Promise(resolve => setTimeout(resolve, 300));
        onUploadComplete(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-all duration-300 ${
          isDragging
            ? "border-primary bg-primary/5 scale-105 shadow-lg"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="p-8 text-center space-y-4">
          {uploading ? (
            <>
              <div className="flex items-center justify-center">
                {uploadProgress === 100 ? (
                  <CheckCircle2 className="h-12 w-12 text-green-500 animate-in zoom-in" />
                ) : (
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{fileName}</p>
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {uploadProgress === 100 ? "Processing complete!" : `${uploadProgress}% uploaded`}
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">Drop your CSV file here</p>
                <p className="text-sm text-muted-foreground">
                  or click to browse
                </p>
              </div>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".csv,.tsv,.xlsx,.xls"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <Button asChild variant="outline">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Select File
                </label>
              </Button>
              <p className="text-xs text-muted-foreground">
                Supports CSV, TSV, Excel (XLS/XLSX) - Max 100MB
              </p>
            </>
          )}
        </div>
      </Card>

      {error && (
        <Card className="p-4 bg-destructive/10 border-destructive">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setError(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
