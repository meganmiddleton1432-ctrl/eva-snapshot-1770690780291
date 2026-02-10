# Design Guidelines: AI State Evolution Chatbot

## Design Approach
**Selected System:** Material Design (Data Visualization Variant)
**Rationale:** This is a scientific/research tool requiring clear data visualization, real-time updates, and functional clarity. Material Design's emphasis on grid systems, elevation for component hierarchy, and strong support for data-dense interfaces aligns perfectly.

## Core Design Elements

### Typography
- **Primary Font:** Inter (via Google Fonts CDN)
- **Headings:** 600 weight, tracking tight
- **Body:** 400 weight, 16px base size
- **Monospace (metrics/data):** JetBrains Mono, 14px
- **Hierarchy:** Use size scaling (2xl, xl, lg, base, sm) for clear information hierarchy

### Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 6, and 8 (p-2, m-4, gap-6, py-8)
- Consistent padding within cards: p-6
- Section spacing: py-8
- Component gaps: gap-4
- Tight groupings: space-y-2

**Grid Structure:**
- Two-column layout: Chat interface (left 40%) | Visualization panel (right 60%)
- Responsive: Stack vertically on mobile (chat on top, graphs below)
- Max container width: max-w-7xl

### Component Library

**Navigation/Header:**
- Top bar with app title "AI State Evolution Monitor"
- Real-time status indicators (Ψ magnitude, ω frequency)
- Settings icon for API configuration
- Height: h-16, subtle elevation

**Chat Interface:**
- Message bubbles: User (right-aligned, distinct treatment) | AI (left-aligned)
- Input field: Sticky bottom position, with send button
- Scrollable message container with overflow-y-auto
- Memory indicator showing last 10 interactions
- AI identity display (name when assigned)

**Visualization Panel:**
- Three stacked chart containers (equal height distribution)
- Chart 1: Awareness Level (|Ψ|) - line graph
- Chart 2: Cognitive Phase - wave visualization  
- Chart 3: Thinking Speed (ω) - line graph
- Use Chart.js library (CDN) for real-time updating
- Dark chart backgrounds with contrasting grid lines
- Each chart in elevated card container

**Metrics Display:**
- Floating metric cards showing current state
- Display: Psi Magnitude, Psi Phase (radians), Frequency (Hz)
- Position above visualization panel
- Grid layout: grid-cols-3 gap-4

**Input Controls:**
- Primary text input: Full-width with rounded borders
- Send button: Icon-only, positioned inline with input
- Sentiment indicator: Small badge showing detected sentiment (-1 to 1)

**System Messages:**
- Toast notifications for name assignment, memory updates
- Non-intrusive positioning (top-right)

### Animations
**Sparingly Applied:**
- Chart data point transitions: Smooth line updates (300ms ease)
- New message appearance: Fade-in only (200ms)
- Metric value changes: Number counter animation
- NO hover effects, NO background animations, NO page transitions

### Images
**No hero image needed.** This is a functional tool interface.
**Icon Usage:** Heroicons (via CDN) for UI controls - send, settings, status indicators

### Accessibility
- High contrast text on all backgrounds
- Focus states on all interactive elements
- Keyboard navigation for chat input
- Screen reader labels for graph data
- ARIA live regions for real-time metric updates

## Implementation Notes
- Use WebSocket or polling for real-time graph updates
- Implement XAI Grok API integration using Replit Secrets for key management
- Chart.js config: Disable animations for performance during rapid updates
- Local state management for chat history (no page refreshes)
- Ensure responsive breakpoints: mobile (<768px), tablet (768px-1024px), desktop (>1024px)