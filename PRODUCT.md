# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Woxsen students use the public portal to quickly find current campus information, especially from a phone between classes and activities.
- Student Council and operations staff use authenticated management tools to publish content and run events.
- A `food_committee_member` role maintains the Oval mess menu without receiving broader content-administration privileges.

## Product Purpose

The Woxsen Student Council portal is the central web destination for student life: events and registration, clubs, council contacts, sports, support, tickets, and daily campus utilities. The Oval menu feature should let a student understand what is being served today within seconds and let the Food Committee prepare an entire week efficiently.

## Positioning

The portal combines public student-life information with council-owned operational workflows. The Oval menu belongs in the same trusted destination instead of requiring students to search chats, posters, or separate systems.

## Operating Context

- Public use is frequent, brief, and strongly mobile-oriented.
- Oval menus are prepared as weekly schedules and become active by campus day.
- The active day changes at 4:00 a.m. in the `Asia/Kolkata` timezone.
- The final public destination is intended to be a dedicated `/oval` route with a globally discoverable entry point.
- The selected public direction is the time-led “Service line” concept from the temporary comparison page.

## Capabilities and Constraints

- Next.js App Router, React, TypeScript, Tailwind CSS, Drizzle ORM, and Turso/libSQL are established technical constraints.
- The public menu has three canonical meal sections: Breakfast, Lunch, and Dinner. There is no Evening Snacks section.
- Canonical Oval service times are Breakfast 7:00–9:45 AM, Lunch 12:00–2:45 PM, and Dinner 7:00–9:45 PM.
- Public visitors may see only the current service day. Week and adjacent-day controls belong exclusively to management.
- Each meal preserves the operational food categories used in the committee spreadsheet, including breakfast staples, beverages, salads, vegetable preparations, lentils, rice, accompaniments, dessert, Indian bread, and separate Jain lunch/dinner choices.
- Food items need visible vegetarian, egg, and non-vegetarian markers with text equivalents.
- Weekly menus arrive as spreadsheet screenshots or exported documents. OCR must extract the complete seven-day table into structured, editable data.
- OCR output never publishes directly: uncertain cells are flagged, committee members review/edit the current day, next day, or full week, and an authorized user explicitly approves each day before it can go live.
- Only Super Admins and Food Committee members may access Oval management. Normal admins and every other role are excluded.
- Food Committee members need a purpose-built weekly editor and permissions limited to Oval menus; they cannot access unrelated management surfaces.
- The public experience must handle unpublished, incomplete, loading, and stale-week states clearly.
- Oval is currently treated as the only dining venue represented by this feature.
- Imported menu data remains private until an authorized user approves the service day.

## Brand Commitments

- Preserve the Woxsen Student Council name, crest, Woxsen red accent, existing dark/light themes, and the portal's direct student-facing voice.
- The menu is a daily utility inside the existing product, not a separate brand or microsite.

## Evidence on Hand

- The incumbent visual system is implemented in `src/app/globals.css`, `src/app/layout.tsx`, and the shared public components.
- Brand assets are stored under `public/brand/` and `public/wordmark/`.
- Existing authenticated role and management patterns are implemented in `src/lib/rbac.ts` and `src/app/management/`.
- No confirmed real Oval menu data or menu artwork is currently present in the repository.

## Product Principles

- Today first: the current menu must be understandable before historical or future detail.
- One-glance utility: optimize for a student checking a phone in a hurry.
- Weekly once, daily automatically: committee members prepare the week; the system handles daily activation.
- Honest states: never present demo, missing, or stale menu information as current fact.
- Scoped ownership: Food Committee access should not imply access to unrelated portal administration.

## Accessibility & Inclusion

- Meal sections, times, dietary markers, and unavailable states must not depend on color alone.
- The public menu and weekly editor must be keyboard accessible, responsive, and usable with reduced motion.
