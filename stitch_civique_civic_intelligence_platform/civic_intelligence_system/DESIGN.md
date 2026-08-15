---
name: Civic Intelligence System
colors:
  surface: '#FFFFFF'
  surface-dim: '#dbdad7'
  surface-bright: '#faf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f1'
  surface-container: '#efeeeb'
  surface-container-high: '#e9e8e5'
  surface-container-highest: '#e3e2e0'
  on-surface: '#1a1c1a'
  on-surface-variant: '#55423d'
  inverse-surface: '#2f312f'
  inverse-on-surface: '#f1f1ee'
  outline: '#89726c'
  outline-variant: '#dcc1b9'
  surface-tint: '#9b4428'
  primary: '#3b0b00'
  on-primary: '#ffffff'
  primary-container: '#5e1801'
  on-primary-container: '#e47c5c'
  inverse-primary: '#ffb59e'
  secondary: '#6b5c42'
  on-secondary: '#ffffff'
  secondary-container: '#f2ddbb'
  on-secondary-container: '#6f6146'
  tertiary: '#001849'
  on-tertiary: '#ffffff'
  tertiary-container: '#002b75'
  on-tertiary-container: '#7a96e5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59e'
  on-primary-fixed: '#3a0b00'
  on-primary-fixed-variant: '#7c2d13'
  secondary-fixed: '#f4e0be'
  secondary-fixed-dim: '#d7c4a3'
  on-secondary-fixed: '#241a05'
  on-secondary-fixed-variant: '#52452c'
  tertiary-fixed: '#dae1ff'
  tertiary-fixed-dim: '#b3c5ff'
  on-tertiary-fixed: '#001849'
  on-tertiary-fixed-variant: '#23438c'
  background: '#faf9f6'
  on-background: '#1a1c1a'
  surface-variant: '#e3e2e0'
  surface-muted: '#F7F4EE'
  text-primary: '#351008'
  text-secondary: '#6F625C'
  text-muted: '#9B9088'
  border-light: '#E9E1D8'
  border-strong: '#D8CCC0'
  status-reported: '#2E90FA'
  status-assigned: '#7F56D9'
  status-resolved: '#12B76A'
  status-escalated: '#B42318'
  priority-critical: '#B42318'
  priority-high: '#EF6820'
typography:
  display:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  h1:
    fontFamily: Manrope
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.01em
  h2:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  h3:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  h4:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 22px
  label-small:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
  technical:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-width: 272px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  stack-xl: 64px
---

## Brand & Style

The design system is a premium, modern civic technology platform that rejects the bureaucratic aesthetic of traditional government portals. It is built on a foundation of **Corporate / Modern** precision, infused with a **Minimalist** editorial sensibility to evoke trust and intelligence. The experience is designed to be high-performance for administrators while remaining warm and human-centered for citizens.

The style leverages generous whitespace, a structured grid, and a sophisticated color palette to create an environment that feels like a production-grade SaaS application. Every interaction is calibrated to feel intentional, avoiding "flashy" trends in favor of refined, long-lasting utility.

## Colors

The palette is anchored by "Civique Brown" (#5E1801), representing institutional trust and authority, and "Civique Sand" (#CCB999), used as a sophisticated accent for intelligence and call-to-action elements.

The background uses a warm neutral (#FCFBF8) to reduce eye strain and provide a more human feel than pure white. Semantic colors for status (Blue, Green, Red) are distinct from brand colors to ensure operational clarity. Adhere to a **70/20/10 ratio**: 70% warm neutrals/white, 20% Brown for headers and navigation, and 10% Sand for accents.

## Typography

This design system uses a dual-font strategy: **Manrope** for high-level headings and metrics to provide a modern, distinctive character, and **Inter** for all UI, body text, and functional data to ensure maximum legibility and systematic clarity.

**JetBrains Mono** is reserved exclusively for technical identifiers (IDs, timestamps, API data) to distinguish raw system data from human-centric content. Use weight and spacing, rather than just size, to establish hierarchy.

## Layout & Spacing

The layout utilizes a **Fixed Grid** approach for the main content area (max-width 1440px) to maintain a premium, editorial feel. Dashboards utilize a persistent sidebar navigation model on desktop, which collapses to a drawer on mobile.

Spacing follows a strict 4px/8px rhythm. Vertical rhythm is prioritized to create clear sections. Use generous margins around primary content cards (32px on desktop) to evoke a sense of calm and space. Mobile layouts must transition to a single-column stack with 16px horizontal margins.

## Elevation & Depth

Hierarchy is established primarily through **Low-contrast outlines** and tonal layering. Borders (`#E9E1D8`) are the primary tool for visual separation, keeping the interface grounded and operational rather than "floating."

Subtle shadows are used sparingly to indicate interactivity or focus:
- **Cards:** 1px Y-offset with very low opacity (`0.04`) to define the edge.
- **Hover States:** A soft, diffused shadow (`24px` blur) to signal lift.
- **Modals:** Deep, high-contrast shadows to focus user attention on the foreground layer.

## Shapes

The shape language is refined and "Mature." Standard UI elements like buttons and inputs use an 8px radius. As containers grow in size, the radius scales up moderately (up to 16px for modals) to maintain visual harmony. Avoid the "bubble-like" appearance of 24px+ corners to preserve the professional, civic tone of the platform.

## Components

- **Buttons:** Primary buttons use a solid Brown background with White text. Use the "Accent CTA" (Sand background) only for high-value citizen actions like "Report an Issue." Secondary buttons use a White background with a strong border.
- **Cards:** White surfaces with a 1px border. Dashboard metric cards should include a subtle Sand accent line rather than a full color fill.
- **Input Fields:** 8px radius with clear, persistent labels. Never rely on placeholders. Focus states should use a subtle Sand-tinted glow or ring.
- **Admin Sidebar:** Dark Civique Brown background. Active items use a Sand-tinted overlay (`14%` opacity) and a vertical Sand indicator bar on the left.
- **Timeline:** A vertical line with semantic status dots. This is the "trust anchor" of the app; it must be clean, easy to scan, and use chronological connectors.
- **AI Intelligence:** Elements powered by AI should be marked with a "Sparkle" icon and use Sand accents to differentiate them from standard system outputs.