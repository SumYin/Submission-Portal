"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function CustomExtensionsInput({ values, onChange }: { values: string[]; onChange: (vals: string[]) => void }) {
  const [val, setVal] = useState("")
  const add = () => {
    const raw = val.trim()
    if (!raw) return
    const ext = raw.startsWith(".") ? raw.toLowerCase() : `.${raw.toLowerCase()}`
    if (!/^\.[a-z0-9]+$/i.test(ext)) return
    const set = new Set(values)
    set.add(ext)
    onChange(Array.from(set))
    setVal("")
  }
  const remove = (ext: string) => {
    onChange(values.filter((v) => v.toLowerCase() !== ext.toLowerCase()))
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input placeholder=".py" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }} />
        <Button type="button" onClick={add}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((ext) => (
          <Badge key={ext} variant="secondary" className="cursor-pointer" onClick={() => remove(ext)}>{ext} ✕</Badge>
        ))}
      </div>
    </div>
  )
}
