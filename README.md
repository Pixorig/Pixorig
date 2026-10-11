# Pixorig

**Pixorig** is a browser-based image editing tool that runs entirely on the frontend. Built with TypeScript, Vite, [WarmJS](https://github.com/warmjs), and WebAssembly (WASM) — no heavy frameworks like React, Vue, or Angular. All UI panels are lightweight WarmJS components with fine-grained reactivity and zero virtual DOM.

## Features

- **Pure frontend** — All processing happens in the browser. No server-side dependencies.
- **TypeScript + WarmJS** — Type-safe codebase with a self-owned UI runtime: direct-DOM rendering plus signals, minimal footprint, no framework lock-in.
- **WebAssembly (WASM)** — High-performance image processing via C/C++ compiled to WASM.
- **Layer system** — Multi-layer canvas with z-ordering, opacity, lock, visibility, and drag-to-reorder.
- **Text editing** — Rich text layers with font family, size, weight, style, color, gradient, mesh fill, texture fill, curve bend, padding, and text alignment.
- **Panels** — Color picker, Gradient editor, Texture, Opacity, Crop, Rotate, Curve, Relative Position, Cutout, Shadow/3D panels, Background tools (Size/Color/Upload/Camera/Transparent).
- **Auto deploy** — GitHub Actions workflow builds and deploys to GitHub Pages on every push.

## Comparison with Other Tools

| Tool | Pixorig Advantage |
|------|-------------------|
| **Photopea** | Simpler and more beginner-friendly, focusing on ease of use over complexity. |
| **PixelLab (mobile)** | PixelLab lacks a web or desktop version. Pixorig works on any platform with a browser. |
| **Canva** | Basic features like custom fonts often require payment. Gradient design is very limited. Pixorig offers more freedom. |
| **Adobe Photoshop** | Overly complex, forces app installation. No adequate mobile version. Pixorig runs instantly in the browser. |

## Tech Stack

- **TypeScript** — Strict mode, ESNext target
- **Vite** — Dev server with HMR, production bundling
- **[WarmJS](https://github.com/warmjs)** — Self-owned UI runtime (direct DOM + signals, no virtual DOM, zero dependencies)
  - [`@warmjs/core`](https://www.npmjs.com/package/@warmjs/core) — Tiny JSX-to-DOM runtime
  - [`@warmjs/signals`](https://www.npmjs.com/package/@warmjs/signals) — Fine-grained reactivity (signals, effects, shared reset scopes)
  - [`@warmjs/ui`](https://www.npmjs.com/package/@warmjs/ui) — Panel primitives (header, slider, tabs, toggle, knob, color, modals) and ready-made editor panels
- **WebAssembly (WASM)** — C/C++ image processing modules
- **GitHub Actions** — CI/CD auto deploy to GitHub Pages

### Why WarmJS?

Pixorig's UI is a thin shell over a canvas core: sliders, headers, tabs, toggles, and popups. A full virtual-DOM framework re-renders whole subtrees on every keystroke or slider tick; WarmJS updates only the exact DOM node bound to a signal. That keeps 60fps slider drags cheap on low-end phones, shrinks the production bundle, and — because the runtime is owned by the project (~300 lines, auditable) — removes third-party UI risk from the critical path entirely.

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
Pixorig/
├── index.html              # Main entry point
├── css/
│   └── styles.css          # Stylesheets
├── src/
│   ├── main.tsx            # App bootstrap & sidebar/event wiring
│   ├── core/
│   │   ├── layer.ts        # Layer & LayerManager (multi-layer canvas)
│   │   ├── layer/          # Layer services (color, opacity, rotate, ...)
│   │   ├── text/           # Text effect services (shadow, 3D, curve, ...)
│   │   ├── bar-actions.tsx  # Topbar actions, undo/redo, project I/O, modals
│   │   ├── event-bus.ts    # Global event bus
│   │   ├── gradient-apply.ts # Custom gradient application logic
│   │   └── wasm-filter.ts  # WASM filter bindings
│   ├── text/
│   │   ├── text.tsx        # Text UI controller (wires WarmJS panels to services)
│   │   └── text-transform.ts # Canvas text rendering, selection, curve
│   ├── image/
│   │   └── background-io.ts # Background image load / transparent helpers
│   └── ui/
│       ├── dropdown.ts     # Dropdown menu (real DOM)
│       └── LayerList.tsx   # Layer list panel (WarmJS signals)
├── wasm/                   # WebAssembly modules (C/C++ source & compiled)
├── cpp/                    # C/C++ source for WASM compilation
├── font/                   # Custom font assets
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies & scripts
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Actions: build & deploy to Pages
```

UI panels themselves live in [WarmJS](https://github.com/warmjs) (`@warmjs/ui`); Pixorig keeps only the canvas core, services, and thin wiring callbacks.

## Deployment

Push to `master` branch triggers GitHub Actions workflow:
1. Checkout → Install → `npm run build`
2. Upload `dist/` as artifact
3. Deploy to GitHub Pages

Repository: **https://github.com/Pixorig/Pixorig**

## License

Apache License Version 2.0
