"use client"

import { useEffect, useRef } from "react"
import type { EQBand } from "@/app/eq/page"

interface EQChartProps {
  bands: EQBand[]
}

export function EQChart({ bands }: EQChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const width = rect.width
    const height = rect.height
    const padding = 40

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw grid
    ctx.strokeStyle = "rgba(128, 128, 128, 0.2)"
    ctx.lineWidth = 1

    // Vertical grid lines (frequencies)
    const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
    frequencies.forEach((freq) => {
      const x =
        padding + ((Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20))) * (width - 2 * padding)
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()
    })

    // Horizontal grid lines (dB)
    for (let db = -12; db <= 12; db += 3) {
      const y = height / 2 - (db / 12) * (height / 2 - padding)
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Draw 0dB line
    ctx.strokeStyle = "rgba(128, 128, 128, 0.5)"
    ctx.lineWidth = 2
    const zeroY = height / 2
    ctx.beginPath()
    ctx.moveTo(padding, zeroY)
    ctx.lineTo(width - padding, zeroY)
    ctx.stroke()

    // Draw EQ curve
    ctx.strokeStyle = "#3b82f6"
    ctx.lineWidth = 3
    ctx.beginPath()

    // Generate curve points
    const points: { x: number; y: number }[] = []
    for (let freq = 20; freq <= 20000; freq *= 1.1) {
      let totalGain = 0

      bands.forEach((band) => {
        // Simple approximation of filter response
        const ratio = freq / band.frequency
        let gain = 0

        if (band.type === "peaking") {
          const q = band.q
          const bandwidth = band.frequency / q
          const distance = Math.abs(Math.log2(ratio))
          const maxDistance = Math.log2(bandwidth / band.frequency + 1)
          if (distance <= maxDistance) {
            gain = band.gain * (1 - distance / maxDistance)
          }
        } else if (band.type === "lowshelf") {
          if (freq <= band.frequency) {
            gain = band.gain
          } else {
            const rolloff = Math.max(0, 1 - (freq - band.frequency) / band.frequency)
            gain = band.gain * rolloff
          }
        } else if (band.type === "highshelf") {
          if (freq >= band.frequency) {
            gain = band.gain
          } else {
            const rolloff = Math.max(0, 1 - (band.frequency - freq) / band.frequency)
            gain = band.gain * rolloff
          }
        }

        totalGain += gain
      })

      const x =
        padding + ((Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20))) * (width - 2 * padding)
      const y = height / 2 - (totalGain / 12) * (height / 2 - padding)
      points.push({ x, y })
    }

    // Draw the curve
    if (points.length > 0) {
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.stroke()
    }

    // Draw frequency labels
    ctx.fillStyle = "rgba(128, 128, 128, 0.8)"
    ctx.font = "12px sans-serif"
    ctx.textAlign = "center"
    frequencies.forEach((freq) => {
      const x =
        padding + ((Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20))) * (width - 2 * padding)
      const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`
      ctx.fillText(label, x, height - 10)
    })

    // Draw dB labels
    ctx.textAlign = "right"
    for (let db = -12; db <= 12; db += 6) {
      const y = height / 2 - (db / 12) * (height / 2 - padding)
      ctx.fillText(`${db > 0 ? "+" : ""}${db}dB`, padding - 10, y + 4)
    }
  }, [bands])

  return (
    <div className="w-full h-64 bg-card border rounded-lg">
      <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
    </div>
  )
}
