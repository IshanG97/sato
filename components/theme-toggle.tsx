"use client"

import * as React from "react"
import { Sun, Moon, SunMoon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggleButton() {
  const { theme, setTheme } = useTheme()
  const [modeIndex, setModeIndex] = React.useState(0)

  const modes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"]

  React.useEffect(() => {
    // Initialize index based on current theme
    const index = modes.indexOf(theme as any)
    setModeIndex(index >= 0 ? index : 0)
  }, [theme])

  const handleClick = () => {
    const nextIndex = (modeIndex + 1) % modes.length
    setTheme(modes[nextIndex])
    setModeIndex(nextIndex)
  }

  const current = modes[modeIndex]

  const Icon = {
    light: Sun,
    dark: Moon,
    system: SunMoon,
  }[current]

  return (
    <Button variant="outline" size="icon" onClick={handleClick} aria-label={`Toggle theme: ${current}`}>
      <Icon className="h-[1.2rem] w-[1.2rem] transition-all" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
