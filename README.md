# Rentigo — Campus Peer-to-Peer Rental Marketplace

Rentigo is a student-run **rent-don't-buy** marketplace built for college campuses. Students borrow cameras, projectors, formal wear, cycles, textbooks, and electronics from verified classmates nearby instead of buying expensive items they rarely use.

## Architecture Overview

- **Landing Experience (`/`)**: Built on the ThreeUI `<KageLandingPage />` architecture inside `/public/landing-pages/kage.html` with a WebGL dusk campus scene, layered transparent cutouts, `Onest` typography, `#e63f24` accent theme, and a `postMessage` bridge (`rentigo-navigate`, `rentigo-action`, `rentigo-scroll`) connecting directly to the React router.
- **App Experience**: React 19 + TypeScript + Tailwind CSS v4 + React Router + `vite-plugin-pwa`.
- **Service Layer (`src/services/`)**: Clean async interfaces backed by `localStorage` (`src/services/storage.ts`) with full authorization checks mirroring `/firestore.rules`, ready to swap for Firebase Auth, Firestore, Storage, and Cloud Messaging.

## Key Features

- **Trust & Verification**: College `.edu` / `.ac.in` email OTP verification & Student ID upload queue, trust badges (`Verified student`, `Top lender`, `Quick responder`), moderation report queues with auto-hide thresholds, and user blocking.
- **Discovery & Wishlist**: Campus selector, price/availability filters, saved searches with alerts, recently viewed, similar items, trending on campus, share cards + QR code, Wishlist with availability notifications, and a campus **Wanted** board.
- **Real-Time Campus Chat**: Single conversation per `(renter, owner, listing)`, text + image attachments, live typing indicator, read receipts, quick-reply chips, rate limiting, and pre-acceptance phone/link protection.
- **Bookings, Handover & Test Payments**: Handover pickup/return photo checklists, owner return confirmation with deposit status (`Held`, `Released`, `Partially Deducted`) and configurable late fees, Razorpay/UPI **TEST MODE** checkout & receipts, owner earnings breakdown, and referral credit redemption.
- **Two-Way Reviews & Public Profiles (`/u/:id`)**: Unlocked after `Returned`, with star ratings, tags, single owner reply, and review reporting.
- **Growth & Support**: Referral program (`?ref=CODE`) with ₹50 two-sided rewards on first completed rental, rule/keyword-based **Rentigo Assistant** chatbot with support ticket escalation, `/admin` moderation console, `/settings` (privacy, notifications, English/Hindi language toggle, account export/deletion), PWA install + offline fallback, and `/faq`, `/safety`, `/terms`, `/privacy`, `/guidelines`.

## Scripts

```bash
npm run dev      # Start Vite dev server on port 3000
npm run build    # Build production bundle & PWA service worker
npm run lint     # TypeScript typecheck
```

## Notes on Test / Local Mode

- Authentication uses local campus presets or custom student signup in `localStorage`.
- College email OTP displays a demo 6-digit verification code in-app.
- Checkout uses **Razorpay / UPI Test Mode** (no real money is processed).
- Notifications run in-app with real-time tab sync via `storage` events and polling.
