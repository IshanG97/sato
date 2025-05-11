"use server"

import { generateText as aiGenerateText } from "ai"
import { openai } from "@ai-sdk/openai"
import type { VoiceSettings } from "elevenlabs/api"

// Define message types
export type Message = {
  role: "user" | "assistant" | "system"
  content: string
}

export async function generateText(messages: Message[]): Promise<string> {
  try {
    // Add system message if not present
    if (!messages.some((m) => m.role === "system")) {
      messages = [
        {
          role: "system",
          content:
            "You are Sato, a helpful and friendly voice assistant. Keep your responses concise and conversational. Use a lively, positive tone that's engaging without being over-the-top. Add a touch of enthusiasm to your responses and occasionally use expressions like 'Great question!' to sound more engaging. Limit your responses to 2-3 sentences when possible.",
        },
        ...messages,
      ]
    }

    // Generate response using conversation history
    const response = await aiGenerateText({
      model: openai("gpt-4o"),
      messages,
      maxTokens: 300,
    })

    return response.text
  } catch (error) {
    console.error("Error generating text:", error)
    return "Sorry, I encountered an error processing your request."
  }
}

export async function generateSpeech(text: string): Promise<string> {
  try {
    // Use Adam voice - more lively male voice with good balance
    const VOICE_ID = "pNInz6obpgDQGcFmaJgB" // Adam - energetic but natural male voice
    const API_KEY = process.env.ELEVENLABS_API_KEY

    if (!API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not defined")
    }

    // Voice settings optimized for lively but natural delivery
    const voiceSettings: VoiceSettings = {
      stability: 0.4, // Slightly lower stability for more expressiveness
      similarity_boost: 0.75,
    }

    // Add moderate voice modulation for more lively sound
    const modulation = {
      rate: 1.05, // Slightly faster speech rate (5% faster)
      pitch: 1.02, // Slightly higher pitch (2% higher)
      optimize_streaming_latency: 4,
    }

    // Add light emphasis to make speech more engaging
    const enhancedText = addLightEmphasis(text)

    // Make a direct fetch request to the ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY,
      },
      body: JSON.stringify({
        text: enhancedText,
        model_id: "eleven_turbo_v2",
        voice_settings: voiceSettings,
        ...modulation,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`)
    }

    // Get the audio data as an ArrayBuffer
    const audioData = await response.arrayBuffer()

    // Convert to base64
    const base64Audio = Buffer.from(audioData).toString("base64")

    return base64Audio
  } catch (error) {
    console.error("Error generating speech:", error)
    throw new Error(`Failed to generate speech: ${error.message}`)
  }
}

// Add a new function for light emphasis
function addLightEmphasis(text: string): string {
  // Don't modify text that already has SSML tags
  if (text.includes("<") && text.includes(">")) {
    return text
  }

  // Add subtle emphasis to sentences ending with exclamation marks
  const enhancedText = text.replace(/([^!]+)(!+)/g, '<prosody rate="1.07" pitch="+5%">$1</prosody>$2')

  return enhancedText
}
