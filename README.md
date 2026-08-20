# 🍜 ParkBite Express

[![Next.js Version](https://img.shields.io/badge/Next.js-16.2--canary-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React Version](https://img.shields.io/badge/React-19.0-blue?style=flat-square&logo=react)](https://react.dev/)
[![TailwindCSS Version](https://img.shields.io/badge/TailwindCSS-v4.0-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma Version](https://img.shields.io/badge/Prisma-7.8.0-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Database](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Error Tracking](https://img.shields.io/badge/Sentry-Enabled-362D59?style=flat-square&logo=sentry)](https://sentry.io/)

A production-grade, ultra-fast full-stack food delivery application optimized for high-density IT Parks. Designed for rapid ordering, desk-side delivery routing, and operational intelligence.

---

## 📖 The Business Problem & Vision

**ParkBite Express** is built for a hyper-local, two-person operations model (one operator + one rider) serving a single corporate office complex. In this environment, speed and trust are everything. Employees ordering snacks during brief 10-minute breaks require a friction-free flow, while delivery riders require optimized floor-by-floor logistics.

### Primary User Personas
*   **The Customer:** An IT Park employee on a tight break. Needs to place an order in under 10 seconds.
*   **The Operator:** Manages orders, updates item availability in real-time, adjusts custom pricing, and tracks daily revenue.
*   **The Rider:** Navigates the office floors with a responsive checklist indicating who gets what, where, and when.

---

## 🚀 Key Feature Highlights

### 1. High-Fidelity Ordering Storefront (`/order`)
*   **Active Category Tabs:** Smooth sticky navigation with active scroll-tracking intersection observers.
*   **Interactive Order Slip:** A sliding side-panel (desktop) / bottom-drawer (mobile) that serves as a living receipt. Features Framer Motion `layout` transitions and counts totals up dynamically.
*   **Custom External Requests:** Customers can order off-menu items from local partner vendors. The app handles this with "Price Verification Pending" checkout states, routing the request to the operator's pricing console.
*   **Order History Lookup:** Instant lookup drawer querying previous orders stored via local storage history tracking.

### 2. Live Order Tracking (`/order/track/[id]`)
*   **Dynamic UI States:** Transitions automatically through `Placed ➔ Preparing ➔ Out for Delivery ➔ Delivered`.
*   **Feedback Capture System:** Integrated 1-5 star ratings with spring physics micro-animations on interaction.
*   **Adaptive Payments:** Dynamic UPI QR code generation via the `qrcode` API, displaying payment interfaces automatically when prices are validated.

### 3. Rider Logistics Console (`/rider`)
*   **Optimized Delivery Views:** Large finger-friendly click targets, direct-dial phone shortcuts, and receipt-style checklists.
*   **Status Toggles:** Dropdowns utilizing optimistic UI updates to instantly modify order statuses.
*   **Window Routing Filter:** segmented controls dividing tasks into 11:00 AM Morning and 4:00 PM Afternoon batches with spring-sliding animations.

### 4. Admin Command Center (`/admin`)
*   **Order Control Room (`/admin/orders`):** Paginated data lists with filters for status, payment, and delivery windows. Includes inline pricing adjustment and instant text-search matching names, phones, or floors.
*   **Menu Workspace (`/admin/menu`):** Instant CRUD controls to toggle item availability or update retail prices.
*   **Zero-Bloat Analytics (`/admin/analytics`):** Real-time monitoring of metrics such as total revenue, order volume trends, average rating, and the North Star metric: **Repeat Customer Rate** (customers with $\ge$ 3 orders per week). 

---

## 🛠️ Architecture & System Structure

The project is structured around standard Next.js App Router patterns, utilizing server components for page renders and React 19 Server Actions for all state mutations.

### File Directory Structure
```
📂 Parkbite
├── 📂 prisma
│   ├── schema.prisma            # Relational database models & PostgreSQL config
│   └── seed.ts                  # Database seeding script
├── 📂 public                    # Static assets & storefront icons
└── 📂 src
    ├── 📂 app
    │   ├── 📂 admin             # Admin-gated routes
    │   │   ├── 📂 analytics     # Analytics dashboard & CSS bar charts
    │   │   ├── 📂 menu          # Menu inventory CRUD management
    │   │   └── 📂 orders        # Order list controller & pricing editor
    │   ├── 📂 api               # REST endpoints (polling status, webhook integrations)
    │   ├── 📂 order             # Customer ordering interface
    │   │   ├── 📂 checkout      # Custom routing, payment validations, & checkout forms
    │   │   └── 📂 track         # Live status timeline, UPI payments, & feedback loops
    │   └── 📂 rider             # Mobile delivery rider console
    ├── 📂 components            # Reusable UI elements (Headers, PostHogInit, SteamCanvas)
    └── 📂 lib                   # Date parsing utilities, Prisma client, & QR generators
```

---

## 📊 Database Schema (Prisma ORM)

The relational schema is optimized for consistency and fast joins:

```mermaid
erDiagram
    Customer ||--o{ Order : places
    Order ||--|{ OrderItem : contains
    Order ||--o| Feedback : receives
    MenuItem ||--o{ OrderItem : references

    Customer {
        String id PK
        String name
        String phone UK
        String company
        String floor
        DateTime createdAt
    }

    MenuItem {
        String id PK
        String name
        Enum category
        Decimal costPrice
        Decimal sellPrice
        Boolean isAvailable
        String imageUrl
    }

    Order {
        String id PK
        String customerId FK
        Enum deliveryWindow
        Enum status
        Decimal totalAmount
        Enum paymentMethod
        Enum paymentStatus
        String upiReferenceNo
        String paidBy
        String customRequest
        DateTime createdAt
    }

    OrderItem {
        String id PK
        String orderId FK
        String menuItemId FK
        Int quantity
        Decimal priceAtOrder
    }

    Feedback {
        String id PK
        String orderId FK
        Int rating
        String comment
        DateTime createdAt
    }
```

---

## ⚡ Performance Engineering & Best Practices

*   **0-Bloat Custom Analytics:** Instead of adding heavy libraries like Recharts or D3 (which increase JS bundles by $\approx$ 300KB), analytics charts are rendered using pure CSS Flexbox and semantic HTML. This guarantees near-instant mobile loads.
*   **Low-Overhead Micro-Animations:** Replaced heavy Three.js canvas modules with a lightweight HTML5 Canvas2D particle system ([`SteamCanvas.tsx`](file:///d:/Projects/Parkbite/src/components/SteamCanvas.tsx)) to render a warm, gently rising steam loop over the brand logo—achieving a buttery 60fps on low-end smartphones.
*   **Optimistic State Updates:** Standardized client UI updates (adding to slips, changing payment marks) before server validation loops finish, maximizing perceived snappiness.
*   **Type-Safe Server Actions:** Abandoned manual API route handshakes for secure, compiler-checked React Server Actions, keeping input validators strictly aligned with PostgreSQL schema enums.

---

## 📦 Technical Stack Decision Matrix

| Layer | Choice | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router)** | Server Components for instant paint times; API routes and server actions unified in a single deploy. |
| **Styling** | **Tailwind CSS v4** | CSS-variables first styling, removing build time utility compilation overhead. |
| **Animation**| **Framer Motion** | Spring-physics transitions and layouts that honor system accessibility (`prefers-reduced-motion`). |
| **Database**  | **Supabase PostgreSQL** | Row-level security (RLS), scalable free tier, and built-in connection pooling. |
| **ORM**      | **Prisma** | Safe database schemas, automatic type generation, and rapid seeding. |
| **Error Trace**| **Sentry** | Full-stack telemetry logging client/server errors instantly. |
| **Product Anal**| **PostHog** | Session replays and funnel analysis to isolate bottlenecks in the 10s ordering flow. |

---

## 💻 Local Setup & Development

### 1. Prerequisites
Ensure you have Node.js (v18+) and PostgreSQL installed, or have a Supabase project connection string ready.

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
# Database connection
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Optional Auth password for Admin/Rider consoles
ADMIN_PASSWORD="your-admin-password"
RIDER_PASSWORD="your-rider-password"

# Optional telemetry
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"
```

### 3. Database Sync & Seeding
Install package dependencies and push the Prisma schema directly to your PostgreSQL database instance:
```bash
# Install dependencies
npm install

# Push schema definition
npx prisma db push

# Seed initial menu configuration
npx prisma db seed
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the storefront ordering page.

---

## 🧪 Production Verification Suite

Before deployment, ensure the system functions correctly using the local verification checklist:
1.  **Cut-off Times Validation:** Confirm order placements reject checkout requests made past the afternoon **3:30 PM** cutoff limit.
2.  **Custom Request Pricing Loop:**
    *   Place a custom order with no standard menu items.
    *   Verify the tracking page displays "Price Pending" and hides the UPI QR code.
    *   Edit the price in `/admin/orders` or `/rider` via the inline editor and save.
    *   Confirm the customer tracking page updates with the new price and renders the QR payment code.
3.  **Analytics Integrity:** Execute `npx tsx scratch/test-analytics.ts` to verify database query analytics function without database locks.
