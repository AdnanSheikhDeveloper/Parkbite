# Build Summary — Phase 5: Analytics, Referral Loop, and Feedback Capture

This summary details the packages installed, environment variables, schema modifications, routes added, and rider/store polished features for **Phase 5**.

---

## 1. Packages Installed
- No new external packages were added in this session. Recharts was evaluated, but we chose custom CSS-based responsive bar charts to achieve 0 package bloat, instant mobile load times, and native React 19 compatibility.

---

## 2. Environment Variables Required
Configure the following PostHog variables:
```env
NEXT_PUBLIC_POSTHOG_KEY=phc_...      # PostHog Project API key (obtained from posthog.com project settings)
NEXT_PUBLIC_POSTHog_HOST=https://... # PostHog host URL (either https://us.i.posthog.com or https://eu.i.posthog.com)
```
*Note: If these variables remain unset or are set to placeholder values, the application will degrade gracefully by outputting a warning in the console and displaying an internal info card inside the admin analytics page, without crashing the customer, admin, or rider interfaces.*

---

## 3. Schema & Migration Changes
- Added the `Feedback` model in [schema.prisma](file:///d:/Projects/Parkbite/prisma/schema.prisma) representing a 1-to-1 relation with `Order`.
- Added the inverse relation `feedback Feedback?` to the `Order` model.
- Synchronized database schemas with Supabase PostgreSQL using `npx prisma db push` to preserve existing client entries.

---

## 4. Routes & Files Created/Modified
- [src/app/order/track/actions.ts](file:///d:/Projects/Parkbite/src/app/order/track/actions.ts) — Server actions for client-side feedback submission and customer history queries (`getCustomerOrderHistory`).
- [src/app/order/track/[id]/page.tsx](file:///d:/Projects/Parkbite/src/app/order/track/%5Bid%5D/page.tsx) — Fetches and serializes `feedback` relation details on tracking query. Generates the UPI QR code only if the payment target is UPI QR and the order's total amount is greater than 0.
- [src/app/order/track/[id]/TrackOrderClient.tsx](file:///d:/Projects/Parkbite/src/app/order/track/%5Bid%5D/TrackOrderClient.tsx) — Removed the customer "I've Paid" self-report button, replacing it with an informational note that the operator will manually verify transactions. Renders a "Price Verification Pending" card if the order's total amount is 0 and the payment method is UPI QR. Adjusted cash instruction notices and total labels to display custom price verification warnings for order tracking. Integrates Framer Motion animations on status checkmarks and active pulse loops. Adds micro-scale animations on feedback star selections.
- [src/app/admin/analytics/page.tsx](file:///d:/Projects/Parkbite/src/app/admin/analytics/page.tsx) — Server route gating password authorization and querying direct business analytics metrics over selected dates.
- [src/app/admin/analytics/AnalyticsClient.tsx](file:///d:/Projects/Parkbite/src/app/admin/analytics/AnalyticsClient.tsx) — Interactive analytics client rendering dashboard layouts and CSS bar charts.
- [src/components/AdminHeader.tsx](file:///d:/Projects/Parkbite/src/components/AdminHeader.tsx) — Appended the "Analytics" tab link to the primary admin navigation dashboard.
- [src/components/PostHogInit.tsx](file:///d:/Projects/Parkbite/src/components/PostHogInit.tsx) — Added key presence validation check to prevent init errors on unset configurations.
- [src/app/admin/orders/page.tsx](file:///d:/Projects/Parkbite/src/app/admin/orders/page.tsx) — Implemented server-side pagination, status filters, and text search queries (customer name, phone, company, or order ID) with a limit of 10 items per page.
- [src/app/admin/orders/OrdersDashboardClient.tsx](file:///d:/Projects/Parkbite/src/app/admin/orders/OrdersDashboardClient.tsx) — Refactored dashboard layout to include premium window selection segmented tabs (Whole View, Morning 11 AM, Afternoon 4 PM), text search bar, order status select dropdown, payment status select dropdown, and pagination controls. Added inline price editing with Pencil icon buttons. Integrates active sliding spring capsule tab highlights.
- [src/app/admin/orders/actions.ts](file:///d:/Projects/Parkbite/src/app/admin/orders/actions.ts) — Created `adminUpdateOrderPrice` server action to update the order price in the database.
- [src/app/rider/actions.ts](file:///d:/Projects/Parkbite/src/app/rider/actions.ts) — Created `riderUpdateOrderPrice` server action to allow riders to update order prices. Added `riderUpdateOrderStatus` server action to allow riders to change order status dynamically.
- [src/app/rider/RiderDashboardClient.tsx](file:///d:/Projects/Parkbite/src/app/rider/RiderDashboardClient.tsx) — Refactored order lists into local `RiderOrderCard` child components, self-encapsulating local states, and integrating inline price editors with Pencil icons. Displays order ID directly below the customer's contact details. Polished the layout to look like a premium delivery application (header gradients, location map pins, receipt-style item lists, and large finger-friendly call/delivery action buttons). Added status modification select dropdowns in the top-right of rider cards. Integrates spring sliding active capsule selector highlights on window filters.
- [src/lib/date-utils.ts](file:///d:/Projects/Parkbite/src/lib/date-utils.ts) — Extended the afternoon delivery window cutoff from 3:00 PM to **3:30 PM** IST.
- [src/app/order/OrderClient.tsx](file:///d:/Projects/Parkbite/src/app/order/OrderClient.tsx) — Added trash-can discard buttons next to cart list items (both desktop and mobile), an "Add to Slip" button for special instructions, custom requests verification card inside the Order Slip, and checkout redirect support for empty-cart custom orders. Displays partial grand totals (`₹Total + Custom TBD`) on the Order Slip and mobile drawer when custom items are combined with canteen menu items. Renders a sliding "My Order History" right-drawer containing placed customer orders. Integrates sticky category navigation directly inside the header component with active scroll-tracking intersection margins (`-190px`) and responsive target margins. Resolved a ReferenceError by moving category calculations above observer hooks. Integrates custom spring card hover scales and active sliding capsule backgrounds across menu navigation filters.
- [src/app/order/checkout/page.tsx](file:///d:/Projects/Parkbite/src/app/order/checkout/page.tsx) — Restructured checkout mount loading validators and totals panels to support orders with only custom requests (displaying "Price Pending" with explanatory warnings). Clears `parkbite_custom_request_raw` and `parkbite_selected_extras` along with cart data on successful order creation, appending the order ID to `parkbite_order_history` localStorage list. Auto-selects Cash payment and hides the UPI QR method when custom requests are present, updating summary layouts to reflect the `₹Total + Custom Price TBD` values. Warning text conditionally checks for canteen item presence to display correct pricing context.
- [src/app/order/checkout/actions.ts](file:///d:/Projects/Parkbite/src/app/order/checkout/actions.ts) — Restructured server validations to allow order placement with 0 standard menu items if custom request notes are present, and updated cutoff error texts to 3:30 PM.
- [src/components/SteamCanvas.tsx](file:///d:/Projects/Parkbite/src/components/SteamCanvas.tsx) — Adjusted absolute canvas class positioning from hardcoded text offsets to centered translation offsets to overlay steam particles directly on top of the storefront header's noodle bowl icon (`🍜`).

---

## 5. Direct Database Metrics Verification (Actual Run Results)
The metrics below were measured and verified by executing direct queries against the active Supabase PostgreSQL database instance using `npx tsx scratch/test-analytics.ts`:

- **Total Orders in Database:** 9 orders
- **Total Revenue (PAID orders):** ₹19.00
- **Average Feedback Rating:** No reviews (0 reviews registered on initial push)
- **Repeat Customer Rate (North Star Metric):** **67%** (2 out of 3 active customers placed 3 or more orders in a rolling 7-day period)

---

## 6. Manual Verification Checklist (For the Founder)
1. [ ] **Set up PostHog (Optional but Recommended):**
   Sign up at `posthog.com` for a free account. Copy the API key and host URL, and configure `NEXT_PUBLIC_POSTHog_KEY` and `NEXT_PUBLIC_POSTHog_HOST` in the Vercel env settings.
2. [ ] **Verify tracking share links & secure payments:**
   Open a completed order's tracking page `/order/track/[orderId]`. Verify the "I've Paid" self-report button is gone, and payment is verified solely via operator/rider marks.
3. [ ] **Verify cart item deletions & custom requests:**
   - In `/order`, add multiple items. Click the Trash icon on the Order Slip. Confirm the item is discarded instantly.
   - Type a custom request, click "Add to Slip". Verify that the request appears directly inside the Order Slip and is marked as applied.
4. [ ] **Test checkout with ONLY a custom request (Cart empty):**
   - Clear the cart. Type a custom request like *"Hanif Biryani 2 plates with raita"* and click "Add to Slip".
   - Confirm that the "Place order" button displays on the Order Slip, and the Grand Total shows "Price Pending" with a warning label.
   - Click "Place order". Confirm that the checkout page loads without redirecting you back.
   - Verify the Grand Total shows "Price Pending" with the warning note on checkout. Place the order and check that it routes successfully to the tracking view.
   - On the tracking page, verify the QR code does NOT show up yet, and instead renders a *"Price Verification Pending"* card.
   - Access `/admin/orders` or `/rider` delivery board. Find the new custom order. Click the Pencil icon next to price, enter the price, and click Save.
   - Refresh the tracking page and verify that the correct UPI QR code displays.
5. [ ] **Verify extended 3:30 PM cutoff:**
   Attempt to place an order at 3:15 PM IST. Confirm that the afternoon 4:00 PM target delivery window remains active for the same day (closes at 3:30 PM).
6. [ ] **Test Paginated Admin Orders search & toggles:**
   - Type customer details in the search input on `/admin/orders` and confirm page results.
   - Toggle between Whole View, Morning, and Afternoon windows.
7. [ ] **Check localStorage clearing:**
   Complete an order checkout. Visit `/order` again and confirm that the extras selections and custom request notes are completely reset (empty).
8. [ ] **Verify Rider Order ID view & Polished Mobile UI:**
   Access the `/rider` delivery board. Verify that the UI looks highly polished with gradient headers, capsule toggles, receipt-style item lists, and finger-friendly call/delivery action buttons. Order ID should display clearly below the customer's phone link.
9. [ ] **Test Rider Status Dropdown:**
   Change an order's status from `Preparing` to `Out for Delivery` using the top-right select dropdown on a rider order card. Confirm the update updates on `/admin/orders` and the customer tracking page.
10. [ ] **Verify combined cart + custom request flow (Hiding UPI QR & Price TBD labels):**
    - In `/order`, add 1 Samosa (₹15) to cart.
    - Type *"2 lassi from haji hotel"* in the special instruction box and click "Add to Slip".
    - Verify that the desktop Order Slip and mobile bottom drawer calculate the grand total as `₹15 + Custom TBD`, rendering a warning note explaining that custom charges will be added by the operator.
    - Click "Place order". On checkout, verify the Grand Total is `₹15 + Custom Price TBD`, and the **UPI QR payment option is hidden**, leaving only "Pay Cash at Delivery" auto-selected.
    - Submit the order. On tracking page `/order/track/[orderId]`, verify that the payment method is Cash, the payment instruction warns about pending price verification, and the Grand Total displays `₹15` with `* Custom price pending verification`.
11. [ ] **Verify Customer Order History drawer:**
    - Place one or more test orders.
    - Visit `/order` storefront. Click the **My Orders** button in the header.
    - Confirm that a sliding right-drawer opens displaying the list of placed orders, showing details such as date, time, status badge (e.g. Placed, Preparing, Delivered), item list, amount, and a clickable **Track Order** link routing to the specific order's track view.
12. [ ] **Verify Category Tabs Smooth Scroll and Active Highlights:**
    - Scroll up and down on the `/order` menu list.
    - Confirm that the category header bar pins stickily inside the main header.
    - Confirm that the active category tab (e.g. Snacks, Beverages, Chinese) automatically highlights in green-accent and scales slightly as that section scrolls into view.
    - Click on any category tab and confirm that the page scrolls smoothly to focus that specific menu section instantly without overlapping elements.
13. [ ] **Verify Steam Animation Alignment:**
    Access the storefront `/order` and verify that the steam particle effects float directly upwards from the center of the hot noodle bowl icon (`🍜`) in the main header, instead of overlapping the "ParkBite" text.
14. [ ] **Verify Tab Sliders and Micro-Animations:**
    - Visit storefront `/order`, admin panel `/admin/orders`, and rider console `/rider`.
    - Check the window selection buttons and category navigation. Confirm that active selectors utilize smooth spring sliding bubbles (Framer Motion `layoutId`) when changing active segments.
    - Check storefront menu items and tracking star feedback buttons. Confirm that items scale up smoothly on hover and bounce slightly on tap.
