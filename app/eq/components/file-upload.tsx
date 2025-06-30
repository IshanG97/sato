"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { Upload, FileAudio, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FileUploadProps {
  onFileSelect: (file: File) => void
}

export function FileUpload({ onFileSelect }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files)
      const audioFile = files.find(
        (file) =>
          file.type.startsWith("audio/") ||
          file.name.toLowerCase().endsWith(".mp3") ||
          file.name.toLowerCase().endsWith(".wav"),
      )

      if (audioFile) {
        setSelectedFile(audioFile)
        onFileSelect(audioFile)
      }
    },
    [onFileSelect],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setSelectedFile(file)
        onFileSelect(file)
      }
    },
    [onFileSelect],
  )

  const clearFile = useCallback(() => {
    setSelectedFile(null)
  }, [])

  return (
    <div className="space-y-4">
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 rounded-full bg-muted">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium">Drop your audio file here</p>
            <p className="text-sm text-muted-foreground">Supports MP3, WAV files up to 50MB</p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">or</span>
          </div>

          <Button variant="outline" asChild>
            <label className="cursor-pointer">
              <FileAudio className="h-4 w-4 mr-2" />
              Browse Files
              <input type="file" accept="audio/*,.mp3,.wav" onChange={handleFileSelect} className="hidden" />
            </label>
          </Button>
        </div>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center space-x-3">
            <FileAudio className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={clearFile}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
