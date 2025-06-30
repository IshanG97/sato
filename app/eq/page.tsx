"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Upload, RotateCcw, Settings, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SatoLogo } from "@/components/sato-logo"
import { ThemeToggleButton } from "@/components/theme-toggle"
import { EQChart } from "@/app/eq/components/eq-chart"
import { FileUpload } from "@/app/eq/components/file-upload"
import { AudioPlayer } from "@/app/eq/components/audio-player"

export interface EQBand {
  frequency: number
  gain: number
  q: number
  type: "lowpass" | "highpass" | "bandpass" | "lowshelf" | "highshelf" | "peaking" | "notch" | "allpass"
}

export interface EQSuggestion {
  genre: string
  confidence: number
  bands: EQBand[]
  description: string
}

export default function EQPage() {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [eqSuggestion, setEqSuggestion] = useState<EQSuggestion | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [useEQ, setUseEQ] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [customEQ, setCustomEQ] = useState<EQBand[]>([])

  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const eqNodesRef = useRef<BiquadFilterNode[]>([])
  const gainNodeRef = useRef<GainNode | null>(null)
  const startTimeRef = useRef<number>(0)
  const pauseOffsetRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)
  const isPlayingRef = useRef<boolean>(false) // Use ref to avoid stale closures

  // Default EQ bands (10-band EQ)
  const defaultEQBands: EQBand[] = [
    { frequency: 32, gain: 0, q: 1, type: "lowshelf" },
    { frequency: 64, gain: 0, q: 1, type: "peaking" },
    { frequency: 125, gain: 0, q: 1, type: "peaking" },
    { frequency: 250, gain: 0, q: 1, type: "peaking" },
    { frequency: 500, gain: 0, q: 1, type: "peaking" },
    { frequency: 1000, gain: 0, q: 1, type: "peaking" },
    { frequency: 2000, gain: 0, q: 1, type: "peaking" },
    { frequency: 4000, gain: 0, q: 1, type: "peaking" },
    { frequency: 8000, gain: 0, q: 1, type: "peaking" },
    { frequency: 16000, gain: 0, q: 1, type: "highshelf" },
  ]

  // Initialize audio context and default EQ
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    setCustomEQ(defaultEQBands)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Sync isPlaying state with ref
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  const handleFileSelect = useCallback(async (file: File) => {
    console.log("Loading file:", file.name)
    setAudioFile(file)

    // Reset playback state
    setIsPlaying(false)
    isPlayingRef.current = false
    setCurrentTime(0)
    pauseOffsetRef.current = 0

    if (!audioContextRef.current) {
      console.error("No audio context available")
      return
    }

    try {
      const arrayBuffer = await file.arrayBuffer()
      console.log("File loaded, decoding audio...")
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      console.log("Audio decoded successfully:", {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
      })
      setAudioBuffer(audioBuffer)
      setDuration(audioBuffer.duration)
    } catch (error) {
      console.error("Error decoding audio file:", error)
      alert("Error loading audio file. Please try a different file.")
    }
  }, [])

  const processAudio = async () => {
    if (!audioFile) return

    setIsProcessing(true)
    setProcessingProgress(0)

    // Simulate processing progress
    const progressInterval = setInterval(() => {
      setProcessingProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    try {
      const formData = new FormData()
      formData.append("audio", audioFile)

      const response = await fetch("/api/eq/process", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to process audio")
      }

      const result = await response.json()
      setEqSuggestion(result)
      setProcessingProgress(100)
    } catch (error) {
      console.error("Error processing audio:", error)
      alert("Error processing audio. Please try again.")
    } finally {
      clearInterval(progressInterval)
      setIsProcessing(false)
      setTimeout(() => setProcessingProgress(0), 1000)
    }
  }

  const createEQNodes = useCallback((bands: EQBand[]) => {
    if (!audioContextRef.current) return []

    return bands.map((band) => {
      const filter = audioContextRef.current!.createBiquadFilter()
      filter.type = band.type
      filter.frequency.setValueAtTime(band.frequency, audioContextRef.current!.currentTime)
      filter.gain.setValueAtTime(band.gain, audioContextRef.current!.currentTime)
      filter.Q.setValueAtTime(band.q, audioContextRef.current!.currentTime)
      return filter
    })
  }, [])

  const stopCurrentPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop()
        sourceNodeRef.current.disconnect()
      } catch (error) {
        // Ignore errors when stopping
      }
      sourceNodeRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Clean up EQ nodes
    eqNodesRef.current.forEach((node) => {
      try {
        node.disconnect()
      } catch (error) {
        // Ignore errors
      }
    })
    eqNodesRef.current = []

    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.disconnect()
      } catch (error) {
        // Ignore errors
      }
      gainNodeRef.current = null
    }
  }, [])

  // Improved updateTime function without dependencies on state
  const updateTime = useCallback(() => {
    if (!audioContextRef.current || !sourceNodeRef.current || !isPlayingRef.current) {
      return
    }

    const elapsed = audioContextRef.current.currentTime - startTimeRef.current
    const newTime = Math.min(elapsed, duration)

    setCurrentTime(newTime)

    if (newTime < duration && isPlayingRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateTime)
    } else if (newTime >= duration) {
      // Playback finished
      console.log("Playback finished")
      setIsPlaying(false)
      isPlayingRef.current = false
      setCurrentTime(duration)
      pauseOffsetRef.current = 0
    }
  }, [duration]) // Only depend on duration

  // Start time updates - separate function to ensure it always runs
  const startTimeUpdates = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    console.log("Starting time updates")
    animationFrameRef.current = requestAnimationFrame(updateTime)
  }, [updateTime])

  const playAudio = useCallback(async () => {
    if (!audioBuffer || !audioContextRef.current) {
      console.log("Cannot play: missing audio buffer or context")
      return
    }

    console.log("Starting playback from offset:", pauseOffsetRef.current)

    try {
      // Resume audio context if suspended
      if (audioContextRef.current.state === "suspended") {
        console.log("Resuming suspended audio context")
        await audioContextRef.current.resume()
      }

      // Stop any current playback
      stopCurrentPlayback()

      // Create new source
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      sourceNodeRef.current = source

      // Create gain node
      const gainNode = audioContextRef.current.createGain()
      gainNodeRef.current = gainNode

      // Set up audio graph
      if (useEQ) {
        // Create EQ chain
        const bands = eqSuggestion?.bands || customEQ
        const eqNodes = createEQNodes(bands)
        eqNodesRef.current = eqNodes

        // Connect: source -> EQ chain -> gain -> destination
        let currentNode: AudioNode = source
        eqNodes.forEach((node) => {
          currentNode.connect(node)
          currentNode = node
        })
        currentNode.connect(gainNode)
      } else {
        // Direct connection
        source.connect(gainNode)
      }

      gainNode.connect(audioContextRef.current.destination)

      // Set up timing
      const startTime = audioContextRef.current.currentTime
      const offset = pauseOffsetRef.current
      startTimeRef.current = startTime - offset

      // Handle playback end
      source.onended = () => {
        console.log("Playback ended")
        setIsPlaying(false)
        isPlayingRef.current = false
        if (pauseOffsetRef.current >= duration - 0.1) {
          // If we're at the end, reset to beginning
          setCurrentTime(0)
          pauseOffsetRef.current = 0
        }
      }

      // Start playback
      source.start(startTime, offset)
      setIsPlaying(true)
      isPlayingRef.current = true
      console.log("Playback started successfully")

      // Start time updates - ensure this always happens
      setTimeout(() => {
        startTimeUpdates()
      }, 50) // Small delay to ensure everything is set up
    } catch (error) {
      console.error("Error playing audio:", error)
      setIsPlaying(false)
      isPlayingRef.current = false
      alert("Error playing audio. Please try reloading the file.")
    }
  }, [audioBuffer, useEQ, eqSuggestion, customEQ, stopCurrentPlayback, createEQNodes, duration, startTimeUpdates])

  const pauseAudio = useCallback(() => {
    if (!audioContextRef.current || !sourceNodeRef.current) return

    try {
      const elapsed = audioContextRef.current.currentTime - startTimeRef.current
      pauseOffsetRef.current = Math.min(elapsed, duration)
      console.log("Pausing at:", pauseOffsetRef.current)

      stopCurrentPlayback()
      setIsPlaying(false)
      isPlayingRef.current = false
    } catch (error) {
      console.error("Error pausing audio:", error)
    }
  }, [duration, stopCurrentPlayback])

  const stopAudio = useCallback(() => {
    console.log("Stopping playback")
    stopCurrentPlayback()
    setIsPlaying(false)
    isPlayingRef.current = false
    setCurrentTime(0)
    pauseOffsetRef.current = 0
  }, [stopCurrentPlayback])

  // Add seek functionality
  const seekAudio = useCallback(
    (time: number) => {
      console.log("Seeking to:", time)
      const wasPlaying = isPlayingRef.current

      // Stop current playback
      if (wasPlaying) {
        stopCurrentPlayback()
      }

      // Set new position
      pauseOffsetRef.current = Math.max(0, Math.min(time, duration))
      setCurrentTime(pauseOffsetRef.current)

      // Resume playback if it was playing
      if (wasPlaying) {
        setTimeout(() => {
          playAudio()
        }, 50)
      }
    },
    [duration, stopCurrentPlayback, playAudio],
  )

  const updateEQBand = useCallback(
    (index: number, gain: number) => {
      setCustomEQ((prev) => prev.map((band, i) => (i === index ? { ...band, gain } : band)))

      // Update real-time EQ if playing and EQ is enabled
      if (useEQ && eqNodesRef.current[index] && audioContextRef.current) {
        try {
          eqNodesRef.current[index].gain.setValueAtTime(gain, audioContextRef.current.currentTime)
        } catch (error) {
          console.error("Error updating EQ:", error)
        }
      }
    },
    [useEQ],
  )

  const applyEQSuggestion = useCallback(() => {
    if (eqSuggestion) {
      setCustomEQ(eqSuggestion.bands)
      setUseEQ(true)
    }
  }, [eqSuggestion])

  const resetEQ = useCallback(() => {
    setCustomEQ(defaultEQBands)
    setUseEQ(false)
  }, [])

  // Handle EQ toggle - restart playback if currently playing
  const handleEQToggle = useCallback(
    (enabled: boolean) => {
      console.log("Toggling EQ:", enabled)
      const wasPlaying = isPlayingRef.current

      if (wasPlaying) {
        // Store current position and stop
        if (audioContextRef.current) {
          pauseOffsetRef.current = audioContextRef.current.currentTime - startTimeRef.current
        }
        stopCurrentPlayback()
      }

      setUseEQ(enabled)

      // Restart playback if it was playing
      if (wasPlaying) {
        setTimeout(() => {
          playAudio()
        }, 100)
      }
    },
    [stopCurrentPlayback, playAudio],
  )

  const currentEQData = useEQ ? eqSuggestion?.bands || customEQ : customEQ

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggleButton />
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          <SatoLogo />
          <div className="text-center">
            <h1 className="text-3xl font-bold">Audio EQ Processor</h1>
            <p className="text-muted-foreground">Upload audio and get AI-powered EQ suggestions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Upload & Processing */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Upload Audio</span>
                </CardTitle>
                <CardDescription>Upload an MP3 or WAV file to analyze</CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload onFileSelect={handleFileSelect} />

                {audioFile && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{audioFile.name}</span>
                      <Badge variant="secondary">{(audioFile.size / 1024 / 1024).toFixed(1)} MB</Badge>
                    </div>

                    {audioBuffer && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Duration: {Math.round(duration)}s</div>
                        <div>Sample Rate: {audioBuffer.sampleRate}Hz</div>
                        <div>Channels: {audioBuffer.numberOfChannels}</div>
                      </div>
                    )}

                    <Button onClick={processAudio} disabled={isProcessing} className="w-full">
                      {isProcessing ? (
                        <>
                          <Settings className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Settings className="h-4 w-4 mr-2" />
                          Analyze Audio
                        </>
                      )}
                    </Button>

                    {isProcessing && (
                      <div className="space-y-2">
                        <Progress value={processingProgress} />
                        <p className="text-xs text-muted-foreground text-center">Analyzing audio characteristics...</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* EQ Suggestion Results */}
            {eqSuggestion && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Suggestion</CardTitle>
                  <CardDescription>Based on audio analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{eqSuggestion.genre}</p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(eqSuggestion.confidence * 100)}% confidence
                      </p>
                    </div>
                    <Badge variant="outline">{eqSuggestion.bands.length} bands</Badge>
                  </div>

                  <p className="text-sm">{eqSuggestion.description}</p>

                  <div className="flex space-x-2">
                    <Button onClick={applyEQSuggestion} size="sm" className="flex-1">
                      Apply Suggestion
                    </Button>
                    <Button onClick={resetEQ} variant="outline" size="sm">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Audio Player & EQ Controls */}
          <div className="lg:col-span-2 space-y-4">
            {/* Audio Player */}
            {audioBuffer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Volume2 className="h-5 w-5" />
                    <span>Audio Player</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AudioPlayer
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    onPlay={playAudio}
                    onPause={pauseAudio}
                    onStop={stopAudio}
                    onSeek={seekAudio}
                  />

                  <div className="flex items-center space-x-4 mt-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="use-eq" checked={useEQ} onCheckedChange={handleEQToggle} />
                      <Label htmlFor="use-eq">Enable EQ</Label>
                    </div>
                    <Badge variant={useEQ ? "default" : "secondary"}>{useEQ ? "EQ Active" : "Original"}</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* EQ Visualization & Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Equalizer</CardTitle>
                <CardDescription>Adjust frequency response or view AI suggestions</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="visual" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="visual">Visual EQ</TabsTrigger>
                    <TabsTrigger value="manual">Manual Control</TabsTrigger>
                  </TabsList>

                  <TabsContent value="visual" className="space-y-4">
                    <EQChart bands={currentEQData} />
                  </TabsContent>

                  <TabsContent value="manual" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {customEQ.map((band, index) => (
                        <div key={index} className="space-y-2">
                          <Label className="text-xs font-medium">
                            {band.frequency >= 1000 ? `${band.frequency / 1000}kHz` : `${band.frequency}Hz`}
                          </Label>
                          <div className="h-32 flex items-center">
                            <Slider
                              orientation="vertical"
                              value={[band.gain]}
                              onValueChange={([value]) => updateEQBand(index, value)}
                              max={12}
                              min={-12}
                              step={0.5}
                              className="h-full"
                            />
                          </div>
                          <div className="text-xs text-center text-muted-foreground">
                            {band.gain > 0 ? "+" : ""}
                            {band.gain.toFixed(1)}dB
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
