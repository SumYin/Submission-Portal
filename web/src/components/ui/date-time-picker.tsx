"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export type DateTimePickerProps = {
  id?: string
  label?: string
  valueIso?: string | undefined
  onChange: (valueIso: string | undefined) => void
}

function toLocalDateStringForInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toDisplayDate(d?: Date) {
  return d ? d.toLocaleDateString() : "Select date"
}

export function DateTimePicker({ id, label = "Schedule", valueIso, onChange }: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)

  const valueDate = React.useMemo(() => (valueIso ? new Date(valueIso) : undefined), [valueIso])
  const [dateStr, setDateStr] = React.useState<string>(valueDate ? toLocalDateStringForInput(valueDate) : "")
  const [timeStr, setTimeStr] = React.useState<string>(valueDate ? valueDate.toTimeString().slice(0, 8) : "")

  React.useEffect(() => {
    const d = valueIso ? new Date(valueIso) : undefined
    setDateStr(d ? toLocalDateStringForInput(d) : "")
    setTimeStr(d ? d.toTimeString().slice(0, 8) : "")
  }, [valueIso])

  const commit = React.useCallback((ds: string, ts: string) => {
    if (!ds && !ts) {
      onChange(undefined)
      return
    }
    const time = ts || "00:00:00"
    const local = new Date(`${ds}T${time}`)
    if (isNaN(local.getTime())) {
      onChange(undefined)
      return
    }
    onChange(local.toISOString())
  }, [onChange])

  return (
    <div className="flex gap-4">
      <div className="flex flex-col gap-3">
        <Label htmlFor={`${id ?? "dt"}-date`} className="px-1">
          {label} Date
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" id={`${id ?? "dt"}-date`} className="w-40 justify-between font-normal">
              {toDisplayDate(valueDate)}
              <ChevronDownIcon className="ml-2 size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-3" align="start">
            <Input
              type="date"
              value={dateStr}
              onChange={(e) => {
                const ds = e.target.value
                setDateStr(ds)
                commit(ds, timeStr)
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-3">
        <Label htmlFor={`${id ?? "dt"}-time`} className="px-1">
          {label} Time
        </Label>
        <Input
          type="time"
          id={`${id ?? "dt"}-time`}
          step="1"
          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          value={timeStr}
          onChange={(e) => {
            const ts = e.target.value
            setTimeStr(ts)
            if (dateStr) commit(dateStr, ts)
          }}
        />
      </div>
    </div>
  )
}
