"use client"

export const AUTH_CHANGED_EVENT = "sp:auth-changed"

export function fireAuthChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT))
}

export function onAuthChanged(handler: () => void) {
  if (typeof window === "undefined") return () => {}
  const fn = () => handler()
  window.addEventListener(AUTH_CHANGED_EVENT, fn)
  return () => window.removeEventListener(AUTH_CHANGED_EVENT, fn)
}
