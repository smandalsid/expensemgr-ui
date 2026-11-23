import type { CSSProperties } from 'react'

const MOBILE_BREAKPOINT = 640

interface PanelOptions {
  /** Narrowest the panel may be on desktop. */
  minWidth?: number
  /** Expected panel height; lets it open above the trigger when there is no room below. */
  height?: number
}

// Positions a portal-rendered dropdown panel under its trigger, widening it
// on narrow screens and clamping it so it never spills past the viewport edge.
export function computeDropdownPanelStyle(
  trigger: HTMLElement,
  { minWidth = 240, height }: PanelOptions = {},
): CSSProperties {
  const viewportWidth = window.innerWidth
  const margin = 8

  // On phones, anchoring the panel under the trigger falls apart once the
  // on-screen keyboard opens — the layout/visual viewport shift mobile
  // browsers apply made the panel jump to a seemingly random spot. Instead,
  // dock it as a fixed sheet vertically centered in the visible viewport
  // (biased slightly toward the trigger), which stays put regardless of
  // page scroll or the keyboard's presence.
  if (viewportWidth <= MOBILE_BREAKPOINT) {
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight
    const maxHeight = Math.min(viewportHeight - margin * 2, Math.max(380, height ?? 0))
    const rect = trigger.getBoundingClientRect()
    const triggerCenter = rect.top + rect.height / 2
    const idealTop = triggerCenter - maxHeight / 2
    const top = Math.min(
      Math.max(idealTop, margin),
      viewportHeight - maxHeight - margin
    )
    return {
      position: 'fixed',
      top,
      left: margin,
      right: margin,
      width: 'auto',
      maxHeight,
      overflowY: 'auto',
      zIndex: 9999,
    }
  }

  const rect = trigger.getBoundingClientRect()
  const width = Math.min(Math.max(rect.width, minWidth), viewportWidth - margin * 2)
  const left = Math.min(Math.max(rect.left, margin), viewportWidth - width - margin)

  let top = rect.bottom + 4
  if (height !== undefined) {
    const viewportHeight = window.innerHeight
    const roomBelow = viewportHeight - rect.bottom - margin
    const roomAbove = rect.top - margin
    if (roomBelow < height && roomAbove > roomBelow) {
      top = Math.max(margin, rect.top - 4 - height)
    }
  }
  return { position: 'fixed', top, left, width, zIndex: 9999 }
}
