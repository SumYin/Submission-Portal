"use client"

import * as React from "react"
import { type DateRange } from "react-day-picker"

import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

export type Calendar05Props = {
  value?: DateRange
  onChange?: (value: DateRange | undefined) => void
  className?: string
}

export default function Calendar05({ value, onChange, className }: Calendar05Props) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(value)

  React.useEffect(() => {
    setDateRange(value)
  }, [value])

  const handleSelect = React.useCallback(
    (range: DateRange | undefined) => {
      setDateRange(range)
      onChange?.(range)
    },
    [onChange],
  )

  return (
    <Calendar
      mode="range"
      defaultMonth={dateRange?.from ?? new Date()}
      selected={dateRange}
      onSelect={handleSelect}
      numberOfMonths={2}
      className={cn("rounded-lg border shadow-sm", className)}
    />
  )
}
