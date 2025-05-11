"use client"

import { useState, useEffect, useRef } from "react"
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { SatoLogo } from "./components/sato-logo"
import { generateText, generateSpeech, type Message } from "./actions"

// Declare SpeechRecognition type to avoid Typescript errors
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export default function Sato() {
  const [isListening, setIsListening] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle")
  const [recognitionSupported, setRecognitionSupported] = useState(true)

  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSpeechTimestampRef = useRef<number>(Date.now())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioSourceRef = useRef<string | null>(null)
  const recognitionInitializedRef = useRef<boolean>(false)
  const speechDetectedRef = useRef<boolean>(false)
  const processingRef = useRef<boolean>(false)

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio()

      audioRef.current.onplay = () => {
        setIsPlaying(true)
        setStatus("speaking")
      }

      audioRef.current.onended = () => {
        setIsPlaying(false)
        setStatus("idle")
      }

      audioRef.current.onerror = () => {
        setIsPlaying(false)
        setStatus("idle")
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
      }
    }
  }, [])

  // Initialize speech recognition once
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !recognitionInitializedRef.current &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)
    ) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = "en-US"

        recognitionInitializedRef.current = true
        setRecognitionSupported(true)
      } catch (error) {
        console.error("Error initializing speech recognition:", error)
        setRecognitionSupported(false)
      }
    } else if (typeof window !== "undefined" && !window.SpeechRecognition && !window.webkitSpeechRecognition) {
      setRecognitionSupported(false)
    }
  }, [])

  // Set up speech recognition event handlers when listening state changes
  useEffect(() => {
    if (!recognitionRef.current || !recognitionSupported) return

    const handleSpeechStart = () => {
      console.log("Speech recognition started")
      lastSpeechTimestampRef.current = Date.now()
      speechDetectedRef.current = false
    }

    const handleSpeechResult = (event) => {
      const current = event.resultIndex
      const result = event.results[current]
      const transcriptText = result[0].transcript

      // Only update if we have new content
      if (transcriptText.trim() !== transcript.trim()) {
        setTranscript(transcriptText)
        lastSpeechTimestampRef.current = Date.now()
        speechDetectedRef.current = true
        console.log("Speech detected:", transcriptText)
      }
    }

    const handleSpeechEnd = () => {
      console.log("Speech recognition ended")

      // If we've detected speech and we're still in listening mode, check if we should process
      if (isListening && speechDetectedRef.current && transcript.trim() && !processingRef.current) {
        const silenceDuration = Date.now() - lastSpeechTimestampRef.current
        console.log(`Silence duration at end: ${silenceDuration}ms`)

        if (silenceDuration > 1000) {
          console.log("Processing after speech end")
          stopListeningAndProcess()
        } else {
          // Try to restart recognition to keep listening
          try {
            recognitionRef.current?.start()
          } catch (error) {
            console.error("Error restarting recognition:", error)
          }
        }
      }
    }

    const handleSpeechError = (event) => {
      if (event.error === "aborted") {
        // This is often triggered when starting/stopping quickly, we can ignore it
        return
      }

      if (event.error === "no-speech") {
        // No speech detected, check if we should stop listening
        const silenceDuration = Date.now() - lastSpeechTimestampRef.current
        if (silenceDuration > 3000 && isListening && !processingRef.current) {
          console.log("No speech detected for 3 seconds, stopping")
          stopListeningAndProcess()
        }
        return
      }

      console.error("Speech recognition error:", event.error)

      // For other errors, reset the listening state
      if (isListening) {
        setIsListening(false)
        setStatus("idle")
      }
    }

    // Add event listeners
    recognitionRef.current.onstart = handleSpeechStart
    recognitionRef.current.onresult = handleSpeechResult
    recognitionRef.current.onend = handleSpeechEnd
    recognitionRef.current.onerror = handleSpeechError
    recognitionRef.current.onspeechend = () => {
      console.log("Speech ended event")
      // This event fires when the user stops speaking
      if (isListening && speechDetectedRef.current && transcript.trim() && !processingRef.current) {
        console.log("Processing after speech ended event")
        setTimeout(() => {
          stopListeningAndProcess()
        }, 1000) // Wait 1 second after speech ends before processing
      }
    }

    // Start silence detection if we're listening
    if (isListening) {
      startSilenceDetection()
    } else {
      // Clean up silence detection if we're not listening
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
    }

    return () => {
      // Clean up silence detection
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
    }
  }, [isListening, transcript, recognitionSupported])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Silence detection function
  const startSilenceDetection = () => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current)
    }

    lastSpeechTimestampRef.current = Date.now()

    // Check for silence every 300ms
    silenceTimerRef.current = setInterval(() => {
      const now = Date.now()
      const silenceDuration = now - lastSpeechTimestampRef.current

      // If we have transcript and 1.5 seconds of silence, process it
      if (
        transcript.trim() &&
        speechDetectedRef.current &&
        silenceDuration > 1500 &&
        isListening &&
        !processingRef.current
      ) {
        console.log(`Processing after ${silenceDuration}ms of silence`)
        stopListeningAndProcess()
      }
      // If we've been listening for more than 8 seconds with no transcript, stop
      else if (!transcript.trim() && silenceDuration > 8000 && isListening && !processingRef.current) {
        console.log("No speech detected for 8 seconds, stopping")
        setIsListening(false)
        setStatus("idle")
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop()
          } catch (error) {
            // Ignore errors when stopping
          }
        }
      }
    }, 300)
  }

  const startListening = () => {
    if (!recognitionSupported) {
      alert("Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari.")
      return
    }

    setTranscript("")
    setIsListening(true)
    setStatus("listening")
    lastSpeechTimestampRef.current = Date.now()
    speechDetectedRef.current = false
    processingRef.current = false

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.error("Error starting recognition:", error)
        setIsListening(false)
        setStatus("idle")
      }
    }
  }

  const stopListeningAndProcess = async () => {
    // Prevent multiple calls
    if (processingRef.current || status === "processing") return

    processingRef.current = true

    // Clean up silence detection
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        // Ignore errors when stopping
      }
    }

    setIsListening(false)

    // Only process if we have transcript
    if (transcript.trim()) {
      setStatus("processing")
      await handleSendMessage()
    } else {
      setStatus("idle")
      processingRef.current = false
    }
  }

  const handleSendMessage = async () => {
    if (!transcript.trim()) {
      processingRef.current = false
      return
    }

    const userMessage: Message = { role: "user", content: transcript.trim() }
    const currentTranscript = transcript.trim()

    // Clear transcript immediately to prevent duplicates
    setTranscript("")

    // Add user message to conversation history
    setMessages((prev) => [...prev, userMessage])
    setIsProcessing(true)

    try {
      // Create messages array for API call
      const messagesForAPI = [...messages, userMessage]

      // Generate text response with full conversation history
      const response = await generateText(messagesForAPI)

      // Add assistant response to conversation history
      const assistantMessage: Message = { role: "assistant", content: response }
      setMessages((prev) => [...prev, assistantMessage])

      // Generate speech from the response
      const base64Audio = await generateSpeech(response)

      // Create audio source from base64
      const audioSource = `data:audio/mp3;base64,${base64Audio}`
      audioSourceRef.current = audioSource

      // Play the audio
      playAudio(audioSource)
    } catch (error) {
      console.error("Error generating response:", error)
      const errorMessage = "Sorry, I encountered an error processing your request."
      const assistantMessage: Message = { role: "assistant", content: errorMessage }
      setMessages((prev) => [...prev, assistantMessage])
      setStatus("idle")
    } finally {
      setIsProcessing(false)
      processingRef.current = false
    }
  }

  const playAudio = (source: string) => {
    if (audioRef.current) {
      audioRef.current.src = source
      audioRef.current.play().catch((error) => {
        console.error("Error playing audio:", error)
        setStatus("idle")
      })
    }
  }

  const toggleAudio = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      setStatus("idle")
    } else if (audioSourceRef.current) {
      playAudio(audioSourceRef.current)
    } else if (messages.length > 0) {
      // If no audio source but we have messages, regenerate speech for the last message
      const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant")
      if (lastAssistantMessage) {
        setStatus("processing")
        generateSpeech(lastAssistantMessage.content)
          .then((base64Audio) => {
            const audioSource = `data:audio/mp3;base64,${base64Audio}`
            audioSourceRef.current = audioSource
            playAudio(audioSource)
          })
          .catch((error) => {
            console.error("Error regenerating speech:", error)
            setStatus("idle")
          })
      }
    }
  }

  const getStatusText = () => {
    switch (status) {
      case "listening":
        return "Listening..."
      case "processing":
        return "Processing..."
      case "speaking":
        return "Speaking..."
      default:
        return "Ready"
    }
  }

  // Filter out duplicate messages for rendering
  const uniqueMessages = messages.filter(
    (message, index, self) => index === self.findIndex((m) => m.content === message.content && m.role === message.role),
  )

  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24">
      <Card className="w-full max-w-3xl h-[80vh] flex flex-col">
        <CardHeader className="bg-gradient-to-r from-neutral-800 to-neutral-900 text-white rounded-t-lg">
          <div className="flex flex-col items-center justify-center">
            <div className="text-white">
              <SatoLogo />
            </div>
            <CardDescription className="text-white/80 mt-1">{getStatusText()}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-auto p-4">
          <div className="space-y-4">
            {uniqueMessages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {recognitionSupported
                  ? "Press the microphone button and start speaking"
                  : "Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari."}
              </div>
            ) : (
              uniqueMessages.map((message, index) => (
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"></div>
                    <div
                      className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            {isListening && (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-lg p-3 bg-primary text-primary-foreground">
                  {transcript || "Listening..."}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
        <CardFooter className="border-t p-4">
          <div className="flex w-full items-center justify-center space-x-4">
            <Button
              variant={isListening ? "destructive" : "default"}
              size="icon"
              onClick={isListening ? stopListeningAndProcess : startListening}
              disabled={status === "processing" || status === "speaking" || !recognitionSupported}
              className="h-16 w-16 rounded-full"
            >
              {isListening ? (
                <MicOff className="h-8 w-8" />
              ) : status === "processing" ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>

            {messages.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={toggleAudio}
                disabled={status === "processing" || status === "listening"}
                className="h-12 w-12 rounded-full"
              >
                {isPlaying ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
