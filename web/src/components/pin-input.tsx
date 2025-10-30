"use client"

import { Input } from "@/components/ui/input"
import { useEffect, useRef } from "react"

export function PinInput({
  length = 6,
  value,
  onChangeAction,
  onCompleteAction,
}: {
  length?: number
  value: string
  onChangeAction: (val: string) => void
  onCompleteAction?: (val: string) => void
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    // Ensure focus starts at first empty slot
    const i = Math.min(value.length, length - 1)
    inputs.current[i]?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setChar = (idx: number, char: string) => {
    const chars = value.split("")
    chars[idx] = char
    const next = chars.join("")
    onChangeAction(next)
    if (char && idx < length - 1) inputs.current[idx + 1]?.focus()
    if (next.replace(/\s/g, "").length >= length) onCompleteAction?.(next.slice(0, length))
  }

  const handleKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault()
      if (value[idx]) {
        setChar(idx, "")
      } else if (idx > 0) {
        inputs.current[idx - 1]?.focus()
        setChar(idx - 1, "")
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputs.current[idx - 1]?.focus()
    } else if (e.key === "ArrowRight" && idx < length - 1) {
      inputs.current[idx + 1]?.focus()
    }
  }

  const handleChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value.replace(/[^0-9A-Za-z]/g, "")
    if (!text) {
      setChar(idx, "")
      return
    }
    // if user pasted multiple chars, distribute
    const chars = text.split("")
    for (let i = 0; i < chars.length && idx + i < length; i++) {
      setChar(idx + i, chars[i])
    }
  }

  const handlePaste = (idx: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const clip = e.clipboardData?.getData("text") ?? ""
    const text = clip.replace(/\s+/g, "").replace(/[^0-9A-Za-z]/g, "")
    if (!text) return
    // distribute pasted text across inputs starting from current index
    const nextArr = value.split("")
    for (let i = 0; i < text.length && idx + i < length; i++) {
      nextArr[idx + i] = text[i]
    }
    const next = nextArr.join("")
    onChangeAction(next)
    // focus next available box
    const focusTo = Math.min(idx + text.length, length - 1)
    inputs.current[focusTo]?.focus()
    if (next.replace(/\s/g, "").length >= length) onCompleteAction?.(next.slice(0, length))
  }

  return (
    <div className="flex items-center gap-3">
      {Array.from({ length }).map((_, i) => (
        <Input
          key={i}
          ref={(el) => {
            inputs.current[i] = el
          }}
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          className="w-14 h-14 text-2xl md:w-16 md:h-16 md:text-3xl text-center tracking-widest border-0 border-b-2 rounded-none focus-visible:ring-0 focus:border-primary"
        />
      ))}
    </div>
  )
}
