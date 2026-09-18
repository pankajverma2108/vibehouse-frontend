<div align="center">
  <img src="public/favicon.ico" alt="Vibehouse Logo" width="80" height="80">

  # 🏡 Vibehouse Frontend
  
  **A premium, immersive booking experience for coliving spaces and events.** <br/>
  Crafted with modern web technologies, smooth animations, and breathtaking UI.

  [![Next.js](https://img.shields.io/badge/Next.js-15+-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
  [![GSAP](https://img.shields.io/badge/GSAP-Animation-88CE02?style=for-the-badge&logo=greensock)](https://gsap.com/)

</div>

---

## ✨ Features

- **CRED NeoPOP Design System:** Full neo-brutalist overhaul inspired by [CRED NeoPOP](https://github.com/cred-club/neopop-web) with strict zero border radius (`rounded-none`, `0px`), pitch-black `#0D0D0D` canvas, layered surfaces (`#121212`, `#161616`), and `#3D3D3D` crisp hairlines.
- **Tactile 3D Plunk Buttons:** Custom `NeoPopButton` primitives with 3px 45-degree beveled edges, directional offset shadows, and authentic physical press response (`translate3d(2px, 2px, 0)`).
- **Editorial Display Typography:** High-contrast `Cirka` display serif headlines paired with `Gilroy` UI body copy, tabular numbers, and uppercase tracked utility kickers.
- **Immersive Micro-Interactions:** Smooth animations powered by [Framer Motion](https://motion.dev/) and [GSAP](https://gsap.com/) with full `@media (prefers-reduced-motion: reduce)` accessibility compliance.
- **End-to-End Hospitality Engine:** Booking availability engine, coliving duration tier selectors, itemized digital receipts, Razorpay payment flow, KYC & OCR web check-in, tokenized breakfast orders, and CSAT feedback.
- **Modern Tech Stack:** Built on **Next.js 16 (Turbopack)** with **React 19** and strictly typed with **TypeScript**.

## 🚀 Quick Start

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
# Standard dev server
npm run dev

# Or with Turbopack for faster cold starts
npm run dev:turbo
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🛠️ Build & Production

To create an optimized production build:

```bash
npm run build
npm run start
```

## 🏗️ Architecture & Scripts

- `npm run typecheck` - Validates TypeScript types across the project.
- `npm run lint` - Runs ESLint checks.
- `npm run test` - Runs the Vitest test suite.

## 📝 License & Attribution

This project builds upon premium UI structures designed for modern web applications. The original design inspirations trace back to Extend Base Design Sections.

---
<div align="center">
  <i>Built with ❤️ for a superfast, luxurious coliving experience.</i>
</div>