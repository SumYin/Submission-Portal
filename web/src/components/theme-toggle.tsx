"use client"

import { useEffect, useState } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { applyTheme, getStoredTheme, setStoredTheme, type ThemeMode } from "@/lib/theme"
import { Moon, Sun, Laptop } from "lucide-react"

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system")

  useEffect(() => {
    const m = getStoredTheme()
    setMode(m)
    applyTheme(m)
    // react to system changes when mode is system
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)")
    const onChange = () => {
      if (mode === "system") applyTheme("system")
    }
    mq?.addEventListener?.("change", onChange as any)
    return () => mq?.removeEventListener?.("change", onChange as any)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const select = (m: ThemeMode) => {
    setMode(m)
    setStoredTheme(m)
    applyTheme(m)
  }

  const label = mode === "light" ? "Light" : mode === "dark" ? "Dark" : "System"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" aria-label="Toggle theme">
          {mode === "light" ? (
            <Sun className="h-5 w-5" aria-hidden />
          ) : mode === "dark" ? (
            <Moon className="h-5 w-5" aria-hidden />
          ) : (
            <Laptop className="h-5 w-5" aria-hidden />
          )}
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => select("light")}>
          <Sun className="mr-2 h-4 w-4" aria-hidden /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => select("dark")}>
          <Moon className="mr-2 h-4 w-4" aria-hidden /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => select("system")}>
          <Laptop className="mr-2 h-4 w-4" aria-hidden /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
