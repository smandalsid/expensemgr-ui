import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'
import type { Matcher } from 'react-day-picker'
import 'react-day-picker/style.css'
import { computeDropdownPanelStyle } from '../lib/dropdownPosition'
import { formatDate, parseDateOnly, toDateInputValue } from '../lib/format'

const PANEL_OPTIONS = { minWidth: 296, height: 372 }

interface DatePickerProps {
  id: string
  /** "YYYY-MM-DD" */
  value: string
  /** Earliest selectable date, "YYYY-MM-DD" */
  min: string
  /** Latest selectable date, "YYYY-MM-DD" */
  max: string
  invalid?: boolean
  onChange: (value: string) => void
}

export default function DatePicker({ id, value, min, max, invalid, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const selected = parseDateOnly(value) ?? undefined
  const minDate = useMemo(() => parseDateOnly(min), [min])
  const maxDate = useMemo(() => parseDateOnly(max), [max])

  const disabled = useMemo(() => {
    const matchers: Matcher[] = []
    if (minDate) matchers.push({ before: minDate })
    if (maxDate) matchers.push({ after: maxDate })
    return matchers
  }, [minDate, maxDate])

  const today = new Date()
  const todayValue = toDateInputValue(today)
  const todayAllowed = todayValue >= min && todayValue <= max

  const toggle = () => {
    if (!open && triggerRef.current) {
      setPanelStyle(computeDropdownPanelStyle(triggerRef.current, PANEL_OPTIONS))
    }
    setOpen(o => !o)
  }

  const select = (date: Date) => {
    onChange(toDateInputValue(date))
    setOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (!wrapperRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    // Reposition rather than close so the panel survives scroll and the mobile keyboard.
    const reposition = () => {
      if (triggerRef.current) {
        setPanelStyle(computeDropdownPanelStyle(triggerRef.current, PANEL_OPTIONS))
      }
    }
    // Escape closes only the picker, not the surrounding modal.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    window.visualViewport?.addEventListener('resize', reposition)
    document.addEventListener('keydown', onKeyDown, { capture: true })
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
      window.visualViewport?.removeEventListener('resize', reposition)
      document.removeEventListener('keydown', onKeyDown, { capture: true })
    }
  }, [open])

  return (
    <div className="ce-currency-wrap" ref={wrapperRef}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`ce-currency-trigger ce-date-trigger${open ? ' open' : ''}${invalid ? ' error' : ''}`}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: '#c9a96e', flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className="ce-currency-trigger-label ce-date-value">
          {value ? formatDate(value) : 'Select date'}
        </span>
        <svg
          className={`ce-chevron${open ? ' open' : ''}`}
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="ce-currency-panel ce-cal-panel"
          style={panelStyle}
          role="dialog"
          aria-label="Choose expense date"
        >
          <DayPicker
            mode="single"
            required
            selected={selected}
            onSelect={select}
            defaultMonth={selected ?? today}
            startMonth={minDate ?? undefined}
            endMonth={maxDate ?? undefined}
            disabled={disabled}
            autoFocus
          />
          <div className="ce-cal-footer">
            <span className="ce-cal-hint">{formatDate(min)} – {formatDate(max)}</span>
            <button
              type="button"
              className="ce-cal-today"
              disabled={!todayAllowed}
              onClick={() => select(today)}
            >
              Today
            </button>
          </div>
        </div>
      , document.body)}
    </div>
  )
}
