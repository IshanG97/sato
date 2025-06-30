import { type NextRequest, NextResponse } from "next/server"
import type { EQSuggestion } from "@/app/eq/page"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Validate file type
    const validTypes = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/wave"]
    const isValidType =
      validTypes.some((type) => audioFile.type.includes(type)) ||
      audioFile.name.toLowerCase().endsWith(".mp3") ||
      audioFile.name.toLowerCase().endsWith(".wav")

    if (!isValidType) {
      return NextResponse.json({ error: "Invalid file type. Please upload MP3 or WAV files." }, { status: 400 })
    }

    // Check file size (max 50MB)
    if (audioFile.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 50MB." }, { status: 400 })
    }

    // Simulate processing delay based on file size
    const processingTime = Math.min(3000, Math.max(1000, (audioFile.size / 1024 / 1024) * 500))
    await new Promise((resolve) => setTimeout(resolve, processingTime))

    // Enhanced genre detection
    const fileName = audioFile.name.toLowerCase()
    const fileSize = audioFile.size

    let genre = "Pop/Vocal" // Default
    let confidence = 0.6
    let description = "General audio enhancement with vocal clarity"

    // More sophisticated pattern matching
    if (fileName.includes("rock") || fileName.includes("metal") || fileName.includes("guitar")) {
      genre = "Rock/Metal"
      confidence = 0.9
      description = "Enhanced midrange clarity and controlled low-end for rock music"
    } else if (fileName.includes("jazz") || fileName.includes("acoustic") || fileName.includes("piano")) {
      genre = "Jazz/Acoustic"
      confidence = 0.85
      description = "Natural warmth with enhanced presence for acoustic instruments"
    } else if (
      fileName.includes("electronic") ||
      fileName.includes("edm") ||
      fileName.includes("techno") ||
      fileName.includes("house")
    ) {
      genre = "Electronic/EDM"
      confidence = 0.88
      description = "Punchy bass and crisp highs for electronic music"
    } else if (fileName.includes("classical") || fileName.includes("orchestra") || fileName.includes("symphony")) {
      genre = "Classical"
      confidence = 0.82
      description = "Balanced response preserving natural orchestral dynamics"
    } else if (fileName.includes("hip") || fileName.includes("rap") || fileName.includes("trap")) {
      genre = "Hip-Hop/Rap"
      confidence = 0.8
      description = "Enhanced bass presence with clear vocal articulation"
    }

    // Adjust confidence based on file characteristics
    if (fileSize > 10 * 1024 * 1024) {
      // Larger files might be higher quality
      confidence = Math.min(0.95, confidence + 0.1)
    }

    // Generate EQ suggestions with more variety
    const suggestions: Record<string, any> = {
      "Rock/Metal": [
        { frequency: 32, gain: 2, q: 0.7, type: "lowshelf" },
        { frequency: 64, gain: 1, q: 1, type: "peaking" },
        { frequency: 125, gain: -1, q: 1.2, type: "peaking" },
        { frequency: 250, gain: 0, q: 1, type: "peaking" },
        { frequency: 500, gain: 1, q: 0.8, type: "peaking" },
        { frequency: 1000, gain: 2, q: 1, type: "peaking" },
        { frequency: 2000, gain: 3, q: 1.2, type: "peaking" },
        { frequency: 4000, gain: 1, q: 1, type: "peaking" },
        { frequency: 8000, gain: 2, q: 0.8, type: "peaking" },
        { frequency: 16000, gain: 1, q: 0.7, type: "highshelf" },
      ],
      "Hip-Hop/Rap": [
        { frequency: 32, gain: 4, q: 0.8, type: "lowshelf" },
        { frequency: 64, gain: 3, q: 1, type: "peaking" },
        { frequency: 125, gain: 2, q: 1, type: "peaking" },
        { frequency: 250, gain: 0, q: 1, type: "peaking" },
        { frequency: 500, gain: -1, q: 1.2, type: "peaking" },
        { frequency: 1000, gain: 2, q: 1, type: "peaking" },
        { frequency: 2000, gain: 3, q: 1, type: "peaking" },
        { frequency: 4000, gain: -1, q: 1.5, type: "peaking" },
        { frequency: 8000, gain: 1, q: 1, type: "peaking" },
        { frequency: 16000, gain: 0, q: 0.7, type: "highshelf" },
      ],
      "Jazz/Acoustic": [
        { frequency: 32, gain: 0, q: 1, type: "lowshelf" },
        { frequency: 64, gain: 1, q: 1, type: "peaking" },
        { frequency: 125, gain: 1, q: 1, type: "peaking" },
        { frequency: 250, gain: 2, q: 1, type: "peaking" },
        { frequency: 500, gain: 1, q: 1, type: "peaking" },
        { frequency: 1000, gain: 0, q: 1, type: "peaking" },
        { frequency: 2000, gain: 1, q: 1, type: "peaking" },
        { frequency: 4000, gain: -1, q: 1, type: "peaking" },
        { frequency: 8000, gain: 0, q: 1, type: "peaking" },
        { frequency: 16000, gain: 1, q: 1, type: "highshelf" },
      ],
      "Electronic/EDM": [
        { frequency: 32, gain: 4, q: 1, type: "lowshelf" },
        { frequency: 64, gain: 3, q: 1, type: "peaking" },
        { frequency: 125, gain: 1, q: 1, type: "peaking" },
        { frequency: 250, gain: -1, q: 1, type: "peaking" },
        { frequency: 500, gain: -2, q: 1, type: "peaking" },
        { frequency: 1000, gain: 0, q: 1, type: "peaking" },
        { frequency: 2000, gain: 1, q: 1, type: "peaking" },
        { frequency: 4000, gain: 2, q: 1, type: "peaking" },
        { frequency: 8000, gain: 3, q: 1, type: "peaking" },
        { frequency: 16000, gain: 2, q: 1, type: "highshelf" },
      ],
      Classical: [
        { frequency: 32, gain: 0, q: 1, type: "lowshelf" },
        { frequency: 64, gain: 0, q: 1, type: "peaking" },
        { frequency: 125, gain: 1, q: 1, type: "peaking" },
        { frequency: 250, gain: 1, q: 1, type: "peaking" },
        { frequency: 500, gain: 0, q: 1, type: "peaking" },
        { frequency: 1000, gain: 0, q: 1, type: "peaking" },
        { frequency: 2000, gain: 1, q: 1, type: "peaking" },
        { frequency: 4000, gain: 0, q: 1, type: "peaking" },
        { frequency: 8000, gain: 1, q: 1, type: "peaking" },
        { frequency: 16000, gain: 0, q: 1, type: "highshelf" },
      ],
      "Pop/Vocal": [
        { frequency: 32, gain: 1, q: 1, type: "lowshelf" },
        { frequency: 64, gain: 0, q: 1, type: "peaking" },
        { frequency: 125, gain: 0, q: 1, type: "peaking" },
        { frequency: 250, gain: 1, q: 1, type: "peaking" },
        { frequency: 500, gain: 2, q: 1, type: "peaking" },
        { frequency: 1000, gain: 3, q: 1, type: "peaking" },
        { frequency: 2000, gain: 2, q: 1, type: "peaking" },
        { frequency: 4000, gain: -1, q: 1, type: "peaking" },
        { frequency: 8000, gain: 1, q: 1, type: "peaking" },
        { frequency: 16000, gain: 0, q: 1, type: "highshelf" },
      ],
    }

    const bands = suggestions[genre] || suggestions["Pop/Vocal"]

    const result: EQSuggestion = {
      genre,
      confidence,
      bands,
      description,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error processing audio:", error)
    return NextResponse.json(
      {
        error: "Failed to process audio file. Please try again.",
      },
      { status: 500 },
    )
  }
}
