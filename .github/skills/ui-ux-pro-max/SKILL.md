---
name: ui-ux-pro-max
description: Comprehensive design intelligence for building professional UI/UX across web and mobile platforms. Use this skill when the user asks to build, design, review, fix, or improve any UI — components, pages, dashboards, landing pages, or full applications. Powered by 67 UI styles, 96 color palettes, 57 font pairings, 99 UX guidelines, and 25 chart types across 13 technology stacks. Invoke via `/ui-ux-pro-max` for full design system generation with intelligent reasoning.
license: MIT — https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/LICENSE
---

This skill provides design intelligence for building professional UI/UX. It covers design system generation, industry-specific recommendations, and implementation best practices across all major web and mobile stacks.

Use this skill for any of the following scenarios:

| Scenario | Trigger Examples |
|----------|-----------------|
| **New project / page** | "Build a dashboard", "Make a landing page" |
| **New component** | "Create a pricing card", "Add a modal" |
| **Choose style / color / font** | "What style fits a fintech app?", "Suggest a color palette" |
| **Review existing UI** | "Review this page for UX issues", "Check accessibility" |
| **Fix a UI bug** | "Button hover is broken", "Layout shifts on load" |
| **Improve / optimize** | "Make this faster", "Improve mobile experience" |
| **Add charts / data viz** | "Add an analytics dashboard chart" |
| **Stack best practices** | "React performance tips", "Next.js navigation" |

> **Full design system generation**: Use the `/ui-ux-pro-max` slash command for intelligent design system generation powered by Python search scripts located at `.github/prompts/ui-ux-pro-max/scripts/search.py`.

---

## Design Workflow

### Step 1: Analyze User Requirements

Extract key information:
- **Product type**: SaaS, e-commerce, portfolio, dashboard, landing page, etc.
- **Style keywords**: minimal, playful, professional, elegant, dark mode, etc.
- **Industry**: healthcare, fintech, gaming, education, etc.
- **Stack**: React, Vue, Next.js, or default to `html-tailwind`

### Step 2: Generate Design System (REQUIRED)

Run the design system generator for comprehensive recommendations:

```bash
python3 .github/prompts/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

This returns: pattern, style, colors, typography, effects, and anti-patterns.

**Example:**
```bash
python3 .github/prompts/ui-ux-pro-max/scripts/search.py "beauty spa wellness" --design-system -p "Serenity Spa"
```

### Step 3: Supplement with Domain Searches (as needed)

```bash
python3 .github/prompts/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain>
```

| Need | Domain | Example |
|------|--------|---------|
| UI styles / effects | `style` | `--domain style "glassmorphism dark"` |
| Chart types | `chart` | `--domain chart "real-time dashboard"` |
| UX best practices | `ux` | `--domain ux "animation accessibility"` |
| Font pairings | `typography` | `--domain typography "elegant luxury"` |
| Page structure | `landing` | `--domain landing "hero social-proof"` |

### Step 4: Stack-Specific Guidelines

```bash
python3 .github/prompts/ui-ux-pro-max/scripts/search.py "<keyword>" --stack <stack>
```

Available stacks: `html-tailwind` (default), `react`, `nextjs`, `vue`, `svelte`, `swiftui`, `react-native`, `flutter`, `shadcn`, `jetpack-compose`

---

## Common Rules for Professional UI

### Icons & Visual Elements

| Rule | Do | Don't |
|------|----|----- |
| **No emoji icons** | Use SVG icons (Heroicons, Lucide, Simple Icons) | Use emojis like 🎨 🚀 ⚙️ as UI icons |
| **Stable hover states** | Use color/opacity transitions on hover | Use scale transforms that shift layout |
| **Correct brand logos** | Research official SVG from Simple Icons | Guess or use incorrect logo paths |
| **Consistent icon sizing** | Use fixed viewBox (24x24) with `w-6 h-6` | Mix different icon sizes randomly |

### Interaction & Cursor

| Rule | Do | Don't |
|------|----|----- |
| **Cursor pointer** | Add `cursor-pointer` to all clickable/hoverable cards | Leave default cursor on interactive elements |
| **Hover feedback** | Provide visual feedback (color, shadow, border) | No indication element is interactive |
| **Smooth transitions** | Use `transition-colors duration-200` | Instant state changes or too slow (>500ms) |

### Light/Dark Mode Contrast

| Rule | Do | Don't |
|------|----|----- |
| **Glass card light mode** | Use `bg-white/80` or higher opacity | Use `bg-white/10` (too transparent) |
| **Text contrast light** | Use `#0F172A` (slate-900) for body text | Use `#94A3B8` (slate-400) for body text |
| **Muted text light** | Use `#475569` (slate-600) minimum | Use gray-400 or lighter |
| **Border visibility** | Use `border-gray-200` in light mode | Use `border-white/10` (invisible) |

### Layout & Spacing

| Rule | Do | Don't |
|------|----|----- |
| **Floating navbar** | Add `top-4 left-4 right-4` spacing | Stick navbar to `top-0 left-0 right-0` |
| **Content padding** | Account for fixed navbar height | Let content hide behind fixed elements |
| **Consistent max-width** | Use same `max-w-6xl` or `max-w-7xl` | Mix different container widths |

---

## Pre-Delivery Checklist

### Visual Quality
- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons / Lucide)
- [ ] Brand logos verified from Simple Icons
- [ ] Hover states don't cause layout shift

### Interaction
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback
- [ ] Transitions are smooth (150–300ms)
- [ ] Focus states visible for keyboard navigation

### Light/Dark Mode
- [ ] Light mode text contrast ≥ 4.5:1
- [ ] Glass/transparent elements visible in light mode
- [ ] Borders visible in both modes

### Layout
- [ ] No content hidden behind fixed navbars
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile

### Accessibility
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Color is not the only indicator
- [ ] `prefers-reduced-motion` respected
