# MedGuardian Design System: "Medical Trust" Standards

This document outlines the standardized design system for MedGuardian, focusing on the **Medical Trust** blue-based palette. This system is designed for high accessibility, professionalism, and clarity, particularly for elderly users and caregivers.

## Core Color Palette

### Primary (Medical Trust Blue)
The primary brand color used for action buttons, branding, and key UI elements.
- **Primary-600 (Base):** `#0284C7`
- **Primary-500 (Hover/Lighter):** `#0EA5E9`
- **Primary-50 (Backgrounds):** `#E8F4FD`

### Neutral (Gray Scale)
Used for text, borders, and page backgrounds.
- **Background:** `#F9FAFB` (Gray-50)
- **Text (Heading):** `#111827` (Gray-900)
- **Text (Body):** `#374151` (Gray-700)
- **Border:** `#E5E7EB` (Gray-200)

### Semantic Aliases (Status)
Standardized colors for communicating system state and patient health levels.
- **Critical:** `#EF4444` (Severe issues, medication errors, critical alerts)
- **Warning:** `#F59E0B` (Amber/Yellow - Alerts, potential issues, moderate risk)
- **Success:** `#10B981` (Normal status, medication taken, adherence met)
- **Info:** `#3B82F6` (Neutral information, sync status, general notifications)

---

## Component Guidelines

### 1. Cards (Medical Cards)
Use a clean, white background with subtle rounded corners and soft shadows.
- **Background:** `bg-white`
- **Border:** `border-gray-100` or `border-gray-200`
- **Shadow:** `shadow-sm` or `shadow-md`
- **Radius:** `--radius: 1.5rem` (rounded-3xl)

### 2. Buttons
- **Primary Action:** `bg-primary-600 text-white shadow-primary-500/20`
- **Secondary Action:** `bg-primary-50 text-primary-700 hover:bg-primary-100`
- **Ghost Action:** `text-gray-500 hover:bg-gray-100`

### 3. Typography
- **Headings:** `text-gray-900 font-extrabold tracking-tight`
- **Subheadings:** `text-gray-500 font-medium`
- **Body:** `text-gray-700 font-normal`

---

## Accessibility Best Practices
1. **Contrast Ratio:** Ensure text-to-background contrast meets WCAG AA standards (4.5:1 for normal text).
2. **Color Blindness:** Do not rely on color alone to convey meaning. Use icons (e.g., `AlertTriangle`, `CheckCircle`) alongside status colors.
3. **High Contrast Mode:** Use the `.high-contrast` class for a black-and-white theme if needed.

---

## Implementation Reference
- **Tailwind Config:** [tailwind.config.ts](file:///c:/Users/Adithyakrishnan/Desktop/Medguardian/frontend/tailwind.config.ts)
- **Global Styles:** [globals.css](file:///c:/Users/Adithyakrishnan/Desktop/Medguardian/frontend/src/app/globals.css)
