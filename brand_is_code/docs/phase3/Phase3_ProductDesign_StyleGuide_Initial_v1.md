# Initial Style Guide

## Introduction

This document establishes the foundational visual and design guidelines for the "Brand is Code" platform. It defines the basic visual elements that will create a cohesive, professional, and distinctive user experience aligned with the platform's systematic approach to brand building. This initial style guide focuses on core elements needed for MVP development while providing a framework that can be expanded in future iterations.

## Brand Attributes

The visual design of "Brand is Code" should reflect the following key brand attributes:

1. **Systematic**: Organized, logical, structured, methodical
2. **Data-Driven**: Analytical, evidence-based, precise, insightful
3. **Empowering**: Enabling, supportive, confidence-building
4. **Innovative**: Forward-thinking, modern, tech-savvy
5. **Trustworthy**: Reliable, professional, credible, secure

These attributes should inform all design decisions, from color and typography to layout and interaction patterns.

## Color Palette

### Primary Colors

| Color Name | Hex Code | RGB | Usage |
|------------|----------|-----|-------|
| Code Blue | #2D5BFF | rgb(45, 91, 255) | Primary brand color, key actions, links |
| Data Black | #1A1E2C | rgb(26, 30, 44) | Primary text, headers |
| System White | #FFFFFF | rgb(255, 255, 255) | Backgrounds, text on dark colors |

### Secondary Colors

| Color Name | Hex Code | RGB | Usage |
|------------|----------|-----|-------|
| Logic Green | #00C48C | rgb(0, 196, 140) | Success states, completion, positive indicators |
| Analysis Purple | #7B61FF | rgb(123, 97, 255) | Secondary accents, data visualization |
| Process Yellow | #FFB800 | rgb(255, 184, 0) | Warnings, attention, highlights |
| Error Red | #FF5A5A | rgb(255, 90, 90) | Errors, critical alerts, destructive actions |

### Neutral Colors

| Color Name | Hex Code | RGB | Usage |
|------------|----------|-----|-------|
| Grey 100 | #F7F9FC | rgb(247, 249, 252) | Page backgrounds, subtle separators |
| Grey 200 | #EDF1F7 | rgb(237, 241, 247) | Input backgrounds, cards, sections |
| Grey 300 | #E4E9F2 | rgb(228, 233, 242) | Borders, dividers |
| Grey 400 | #C5CEE0 | rgb(197, 206, 224) | Disabled states, secondary borders |
| Grey 500 | #8F9BB3 | rgb(143, 155, 179) | Secondary text, placeholders |
| Grey 600 | #4C5980 | rgb(76, 89, 128) | Tertiary text, subtle elements |

### Color Usage Guidelines

1. **Accessibility**: Maintain WCAG 2.1 AA compliance for text contrast
2. **Balance**: Use primary and secondary colors sparingly as accents
3. **Data Visualization**: Use secondary colors for charts and graphs, ensuring sufficient contrast
4. **State Indication**: Use consistent colors for states (success, warning, error)
5. **Hierarchy**: Use color to reinforce visual hierarchy and guide attention

## Typography

### Primary Typefaces

**Headings: Inter (Sans-serif)**
- Clean, modern sans-serif with excellent readability
- Weights: 600 (Semi-Bold) for headings, 700 (Bold) for emphasis
- Available on Google Fonts and as a web font

**Body: Inter (Sans-serif)**
- Consistent family for body text maintains cohesion
- Weights: 400 (Regular) for body text, 500 (Medium) for emphasis
- Available on Google Fonts and as a web font

### Monospace Accent

**Code Elements: Fira Code (Monospace)**
- Used for code snippets, technical elements, and special callouts
- Reinforces the "code" aspect of the brand name
- Weights: 400 (Regular)
- Available on Google Fonts and as a web font

### Typography Scale

| Element | Font | Weight | Size | Line Height | Usage |
|---------|------|--------|------|-------------|-------|
| H1 | Inter | 700 | 32px | 40px | Page titles, major sections |
| H2 | Inter | 600 | 24px | 32px | Section headings |
| H3 | Inter | 600 | 20px | 28px | Subsection headings |
| H4 | Inter | 600 | 18px | 24px | Card titles, minor headings |
| Body 1 | Inter | 400 | 16px | 24px | Primary body text |
| Body 2 | Inter | 400 | 14px | 20px | Secondary body text, UI elements |
| Caption | Inter | 400 | 12px | 16px | Labels, captions, metadata |
| Button | Inter | 500 | 16px | 24px | Button text |
| Code | Fira Code | 400 | 14px | 20px | Code snippets, technical elements |

### Typography Guidelines

1. **Hierarchy**: Maintain clear typographic hierarchy for scannable content
2. **Consistency**: Use type scale consistently throughout the interface
3. **Readability**: Ensure sufficient line height and paragraph spacing
4. **Responsiveness**: Adjust type sizes appropriately for different screen sizes
5. **Emphasis**: Use weight variation rather than italics for emphasis

## Layout & Spacing

### Grid System

- Base on 8px grid (multiples of 8) for consistent spacing
- 12-column layout for desktop views
- Fluid columns with fixed gutters
- Breakpoints:
  - Mobile: 320px - 767px
  - Tablet: 768px - 1023px
  - Desktop: 1024px+

### Spacing Scale

| Name | Size | Usage |
|------|------|-------|
| xs | 4px | Minimal spacing, tight elements |
| sm | 8px | Default spacing between related elements |
| md | 16px | Standard spacing between components |
| lg | 24px | Spacing between sections |
| xl | 32px | Major section divisions |
| xxl | 48px | Page sections, major divisions |

### Layout Guidelines

1. **Consistency**: Apply spacing scale consistently
2. **Breathing Room**: Ensure sufficient white space for readability
3. **Grouping**: Use spacing to create logical groupings of related elements
4. **Hierarchy**: Use spacing to reinforce visual hierarchy
5. **Responsiveness**: Adjust spacing appropriately for different screen sizes

## UI Components

### Buttons

#### Primary Button
- Background: Code Blue (#2D5BFF)
- Text: System White (#FFFFFF)
- Border: None
- Border Radius: 8px
- Padding: 12px 24px
- Hover: Darken by 10%
- Active: Darken by 15%
- Disabled: Grey 400 background, Grey 500 text

#### Secondary Button
- Background: Transparent
- Text: Code Blue (#2D5BFF)
- Border: 1px solid Code Blue (#2D5BFF)
- Border Radius: 8px
- Padding: 12px 24px
- Hover: Light blue background (10% opacity)
- Active: Light blue background (15% opacity)
- Disabled: Grey 400 border and text

#### Tertiary Button
- Background: Transparent
- Text: Data Black (#1A1E2C)
- Border: None
- Border Radius: 8px
- Padding: 12px 24px
- Hover: Grey 200 background
- Active: Grey 300 background
- Disabled: Grey 500 text

### Form Elements

#### Text Input
- Background: System White (#FFFFFF)
- Border: 1px solid Grey 300
- Border Radius: 8px
- Padding: 12px 16px
- Focus: 2px border Code Blue, light blue glow
- Error: 2px border Error Red, light red glow
- Placeholder: Grey 500

#### Dropdown
- Same styling as text input
- Dropdown icon: Grey 600
- Options background: System White
- Selected option highlight: Grey 200

#### Checkbox
- Border: 1px solid Grey 400
- Border Radius: 4px
- Checked: Code Blue background, white checkmark
- Focus: 2px border Code Blue, light blue glow

#### Radio Button
- Border: 1px solid Grey 400
- Border Radius: 50%
- Checked: Code Blue outer ring, Code Blue center dot
- Focus: 2px border Code Blue, light blue glow

### Cards

#### Standard Card
- Background: System White (#FFFFFF)
- Border: 1px solid Grey 300
- Border Radius: 12px
- Shadow: 0 4px 12px rgba(0, 0, 0, 0.05)
- Padding: 24px
- Hover: Subtle shadow increase

#### Interactive Card
- Same as standard card
- Hover: Shadow increase, subtle scale transform (1.02)
- Active: Shadow decrease, subtle scale transform (0.98)

### Navigation

#### Main Navigation
- Background: System White (#FFFFFF)
- Active item: Code Blue text, subtle blue background
- Inactive item: Data Black text
- Hover: Grey 200 background
- Icons: Consistent 24x24px, stroke width 2px

#### Tabs
- Inactive: Grey 500 text, no border
- Active: Code Blue text, 2px Code Blue bottom border
- Hover: Data Black text
- Padding: 16px 24px

## Iconography

### Style
- Line icons with consistent 2px stroke width
- Rounded corners (2px radius)
- 24x24px default size
- Consistent padding within bounding box

### System Icons
- Navigation: home, dashboard, projects, settings
- Actions: add, edit, delete, save, export
- Feedback: success, warning, error, information
- Media: image, video, document, download

### Guidelines
- Use icons consistently for the same actions/concepts
- Pair icons with text for clarity when possible
- Maintain consistent sizing and alignment
- Use color sparingly for emphasis or state indication

## Data Visualization

### Charts and Graphs

#### Color Usage
- Use secondary colors for data series
- Ensure sufficient contrast between adjacent data points
- Use consistent colors for the same data categories
- Use color intensity to indicate value when appropriate

#### Typography
- Axis labels: Body 2 (14px)
- Data labels: Caption (12px)
- Titles: H4 (18px)
- Legends: Caption (12px)

#### Style
- Minimal grid lines (Grey 300)
- Subtle axis lines (Grey 400)
- Rounded corners on bars (4px)
- Semi-transparent fills for areas (70-80% opacity)

### Interactive Elements
- Hover states for data points
- Tooltips for detailed information
- Consistent selection indicators
- Clear interactive vs. static visualization distinction

## Imagery

### Style Direction
- Clean, modern imagery with a tech-forward aesthetic
- Abstract representations of data, code, and systems
- Avoid overly corporate stock photography
- Use imagery that reinforces the systematic, code-like approach

### Usage Guidelines
- Use imagery purposefully, not decoratively
- Maintain consistent style across all imagery
- Ensure sufficient contrast with overlaid text
- Optimize images for web performance

## Accessibility Guidelines

- Maintain WCAG 2.1 AA compliance throughout
- Ensure color is not the only means of conveying information
- Provide sufficient contrast for text and interactive elements
- Design focus states for keyboard navigation
- Size touch targets appropriately (minimum 44x44px)
- Support screen readers with appropriate ARIA attributes

## Animation & Transitions

### Principles
- Use animation purposefully to enhance understanding
- Keep animations subtle and professional
- Ensure animations can be disabled for users who prefer reduced motion

### Timing
- Quick actions: 150-200ms
- Standard transitions: 200-300ms
- Complex animations: 300-500ms
- Use ease-out for entering elements
- Use ease-in for exiting elements

### Common Animations
- Page transitions: Fade
- Modal dialogs: Fade + slight scale
- Dropdown menus: Fade + slight transform
- Success/error states: Subtle bounce
- Loading indicators: Pulsing or rotating

## Implementation Notes

This style guide serves as the foundation for the MVP implementation. Development should:

1. Implement these guidelines as a consistent design system
2. Create reusable components based on these specifications
3. Establish CSS variables for colors, typography, and spacing
4. Ensure responsive implementation across breakpoints
5. Document any necessary adjustments during implementation

Future iterations will expand on this foundation with:
- More detailed component specifications
- Additional UI patterns
- Expanded animation guidelines
- Voice and tone guidelines for content
- Advanced data visualization patterns
