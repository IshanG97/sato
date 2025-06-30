"use client"

import { Play, Pause, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

interface AudioPlayerProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onSeek?: (time: number) => void
}

export function AudioPlayer({ isPlaying, currentTime, duration, onPlay, onPause, onStop, onSeek }: AudioPlayerProps) {
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleSeek = (value: number[]) => {
    if (onSeek && duration > 0) {
      const newTime = (value[0] / 100) * duration
      onSeek(newTime)
    }
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      onPause()
    } else {
      onPlay()
    }
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <Slider
          value={[progress]}
          max={100}
          step={0.1}
          className="w-full cursor-pointer"
          onValueChange={handleSeek}
          disabled={duration === 0}
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-2">
        <Button variant="outline" size="icon" onClick={handlePlayPause} disabled={duration === 0}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <Button variant="outline" size="icon" onClick={onStop} disabled={duration === 0}>
          <Square className="h-4 w-4" />
        </Button>
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === "development" && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Current: {currentTime.toFixed(2)}s</div>
          <div>Duration: {duration.toFixed(2)}s</div>
          <div>Progress: {progress.toFixed(1)}%</div>
          <div>Status: {isPlaying ? "Playing" : "Paused"}</div>
        </div>
      )}
    </div>
  )
}
