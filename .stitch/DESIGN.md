# Design System: ZebraPrint Pro — iOS 26 Liquid Glass Premium

## Project
- **Stitch Project ID**: `12838971529428487197`
- **Project Name**: Zebra Labels — iOS 26 Premium
- **Design System Asset**: `assets/13188857710612604466`
- **Target**: Tablet (iPad) + Mobile (iPhone), optimized touchscreen interfaces

---

## 1. Creative North Star: "Liquid Glass Interface"

This design system channels the Apple iOS 26 Liquid Glass aesthetic: translucent surfaces, ultra-refined typography, surgical precision in spacing, and micro-interactions. Every component feels native to the platform — premium, spatial, and alive. The app transitions from a "utility tool" to a "precision instrument" through tonal depth, glassmorphism, and Apple's design vocabulary.

---

## 2. Color System

| Role | Hex | Usage |
|------|-----|-------|
| **Primary** | `#007AFF` | iOS System Blue — CTAs, active tabs, links, sliders |
| **Background** | `#F2F2F7` | iOS Grouped Background — main canvas |
| **Surface** | `#FFFFFF` | Cards, sheets, elevated surfaces |
| **Surface Variant** | `#F2F2F7` | Secondary sections, grouped rows |
| **On Surface** | `#1C1C1E` | Primary text (iOS Label) |
| **On Surface Variant** | `#636366` | Secondary text (iOS Secondary Label) |
| **Tertiary** | `#34C759` | iOS System Green — success, online, confirm |
| **Error** | `#FF3B30` | iOS System Red — error, destructive |
| **Warning** | `#FF9500` | iOS System Orange — warning |
| **Purple** | `#AF52DE` | iOS System Purple — premium badges |

### Color Rules
- **No pure black**: always `#1C1C1E`
- **No 1px solid borders** for sectioning — use background color shifts
- **Separators**: `rgba(60,60,67,0.29)` at 0.5px hairlines between grouped rows

---

## 3. Typography — SF Pro Inspired

| Scale | Size | Weight | Usage |
|-------|------|--------|-------|
| Large Title | 34pt | 700 | Page headers (large title bar style) |
| Title 1 | 28pt | 700 | Section headings |
| Title 2 | 22pt | 700 | Card headings, nav bar |
| Title 3 | 20pt | 600 | Subsection headings |
| Body | 17pt | 400 | Main content text |
| Callout | 16pt | 400 | Supporting text |
| Subheadline | 15pt | 400 | Table rows, secondary content |
| Footnote | 13pt | 400 | Captions, labels |
| Caption | 12pt | 400 | Micro labels, tab bar labels |

- **Headlines**: `Plus Jakarta Sans` (closest to SF Pro Display)
- **Body/Labels**: `Inter` (closest to SF Pro Text)

---

## 4. Surfaces & Liquid Glass

### Glass Components
```css
/* Navigation Bar — Liquid Glass */
.nav-bar {
  background: rgba(242, 242, 247, 0.85);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border-bottom: 0.5px solid rgba(0,0,0,0.08);
}

/* Tab Bar — Floating Glass */
.tab-bar {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border-top: 0.5px solid rgba(0,0,0,0.08);
  padding-bottom: 34px; /* safe area */
}

/* Card — Elevated Surface */
.card {
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
}

/* Input Field — iOS Style */
.input {
  background: rgba(118, 118, 128, 0.12);
  border: none;
  border-radius: 10px;
  padding: 11px 16px;
  font-size: 17px;
}
```

### Surface Hierarchy
1. **Base**: `#F2F2F7` (systemGroupedBackground)
2. **Section**: white cards with 12px radius
3. **Elevated**: white with `0 2px 20px rgba(0,0,0,0.08)` shadow
4. **Modal/Sheet**: white with `0 10px 40px rgba(0,0,0,0.12)` shadow

---

## 5. Layout System

### Breakpoints
- **Mobile** (375–430px): Single column, bottom tab bar, bottom sheets for secondary panels
- **Tablet** (768–1024px): Split view — left panel 380px fixed + right flexible
- **Large Tablet** (1024px+): Three-column for Designer tab

### Safe Areas
- Top: 44–59px (status bar + nav bar)
- Bottom: 34px (home indicator)

### Spacing Scale (multiples of 4)
`4 / 8 / 12 / 16 / 20 / 24 / 32 / 44px`

### Content Margins
- Mobile: 16px horizontal
- Tablet: 20px horizontal
- Grouped list insets: 16px

---

## 6. Component Library

### Navigation Bar
```
[Title Bold 22pt]     [Cloud3 C3 Badge]     [Status Pill: 🟢 Online]
─────────────────────────────────────────────────────────────────────
rgba(242,242,247,0.85) + blur(40px) + hairline bottom
```

### Bottom Tab Bar (5 Tabs)
```
[🖨 Stampa]  [🎨 Designer]  [🕐 Storico]  [👥 Clienti]  [⚙ Impostazioni]
─────────────────────────────────────────────────────────────────────
Active: #007AFF fill + label | Inactive: #636366
rgba(255,255,255,0.85) + blur(40px) + hairline top + 34px bottom padding
```

### Primary Button (CTA)
```css
.btn-primary {
  background: #007AFF;
  color: #FFFFFF;
  border-radius: 9999px; /* full pill */
  height: 50px;
  font-size: 17px;
  font-weight: 600;
  width: 100%;
}
```

### Secondary Button
```css
.btn-secondary {
  background: rgba(0, 122, 255, 0.12);
  color: #007AFF;
  border-radius: 9999px;
  height: 44px;
}
```

### Destructive Button
```css
.btn-destructive {
  color: #FF3B30;
  background: transparent; /* text-only or rgba(255,59,48,0.12) */
}
```

### iOS Toggle Switch
- Active: `#34C759` track, white thumb
- Inactive: `rgba(118,118,128,0.28)` track

### iOS Segmented Control
```css
.segmented {
  background: rgba(118, 118, 128, 0.12);
  border-radius: 9px;
  padding: 2px;
}
.segmented-active {
  background: #FFFFFF;
  border-radius: 7px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.12);
}
```

### Slider
```css
.slider { accent-color: #007AFF; }
```

### Status Indicator Pill
```css
.status-pill {
  background: rgba(52, 199, 89, 0.12); /* green tint */
  border-radius: 9999px;
  padding: 4px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34C759; /* or #FF3B30 for offline */
  animation: pulse 2s infinite; /* for "checking" state */
}
```

### Search Bar
```css
.search-bar {
  background: rgba(118, 118, 128, 0.12);
  border-radius: 9999px; /* full pill */
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
```

### Grouped List (InsetGrouped)
```css
.grouped-section {
  background: #FFFFFF;
  border-radius: 12px;
  margin: 0 16px;
  overflow: hidden;
}
.grouped-row {
  padding: 12px 16px;
  border-bottom: 0.5px solid rgba(60,60,67,0.18);
  display: flex;
  align-items: center;
}
.grouped-row:last-child { border-bottom: none; }
```

### Label Preview Card
```css
.label-preview {
  background: #FFFFFF;
  border: 1.5px dashed rgba(0,0,0,0.15);
  border-radius: 8px;
  padding: 16px;
  /* Content: barcode top, company name bold, device, serial, address */
}
```

### ZPL Code Viewer
```css
.zpl-viewer {
  background: #1C1C1E; /* dark */
  border-radius: 10px;
  padding: 16px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #34C759; /* green terminal text */
}
```

### Toast Notification
```css
.toast {
  background: #1C1C1E;
  color: #FFFFFF;
  border-radius: 9999px;
  padding: 12px 20px;
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 0 4px 24px rgba(0,0,0,0.24);
}
```

---

## 7. Screen Inventory

### Tab 1: Stampa (Print) ✅ Generated
- **File**: `.stitch/designs/01-stampa-full.html` (2560×2048)
- **File**: `.stitch/designs/01-stampa-compact.html` (1280×1024)
- **Screenshot**: `.stitch/designs/01-stampa-screenshot.jpg`
- **Stitch ID**: `a56b5a7edd29426d80c4ccdc43c577fa`
- **Layout**: Split (left: client/device/template/qty form + CTA | right: label preview + ZPL viewer)

### Tab 2: Designer (Template Editor) — Pending Generation
- **Layout**: Three-column (model list | edit form with sliders+toggles | live preview)

### Tab 3: Storico (History) — Pending Generation  
- **Layout**: Stats row + search/filter + table with status icons + pagination

### Tab 4: Clienti (Customers) — Pending Generation
- **Layout**: Split (customer list with search | detail card with edit/delete/print)

### Tab 5: Impostazioni (Settings) — Pending Generation
- **Layout**: iOS Settings style (menu sidebar | detail panel)

---

## 8. Do's and Don'ts

### Do:
- Use `backdrop-filter: blur(40px)` for nav bars and tab bars
- Maintain minimum 44pt touch targets for all interactive elements
- Use grouped InsetList style — white cards on `#F2F2F7` gray
- Use spring animations: `cubic-bezier(0.34, 1.56, 0.64, 1)` for panel reveals
- Respect iOS safe area insets on all screens
- Use full roundness (`border-radius: 9999px`) for pills and primary CTAs

### Don't:
- Don't use hard outlines or thick borders for section separation
- Don't use pure black (`#000000`) — always `#1C1C1E`
- Don't add unnecessary shadows — use tonal layering instead
- Don't crowd — generous whitespace is the iOS signature
- Don't use custom icons that break the SF Symbols visual language
- Don't ignore bottom safe area — content must clear the home indicator
