"use client"

export type ThemeMode = "light" | "dark" | "system"

const THEME_KEY = "sp.theme"

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system"
  try {
    const v = localStorage.getItem(THEME_KEY) as ThemeMode | null
    return v ?? "system"
  } catch {
    return "system"
  }
}

export function setStoredTheme(mode: ThemeMode) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch {}
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  const wantDark = mode === "dark" || (mode === "system" && systemPrefersDark())
  root.classList.toggle("dark", wantDark)
}
