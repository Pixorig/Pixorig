# Pixorig

**Pixorig** is a browser-based image editing tool that runs entirely on the frontend. Built with TypeScript, Vite, Preact, and WebAssembly (WASM) — no heavy frameworks like React, Vue, or Angular. UI panels are lightweight Preact components.

## Features

- **Pure frontend** — All processing happens in the browser. No server-side dependencies.
- **TypeScript + Preact** — Type-safe codebase with Preact (`h` / `Fragment`) for UI panels — minimal footprint, no full React.
- **WebAssembly (WASM)** — High-performance image processing via C/C++ compiled to WASM.
- **Layer system** — Multi-layer canvas with z-ordering, opacity, lock, visibility, and drag-to-reorder.
- **Text editing** — Rich text layers with font family, size, weight, style, color, gradient, mesh fill, texture fill, curve bend, padding, and text alignment.
- **Panels** — Color picker, Gradient, Texture, Opacity, Crop, Rotate, Curve, Relative Position, Cutout, Background sub-panel (Size/Color/Upload/Camera/Transparent).
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
- **Custom JSX runtime** — Preact `h()` / `Fragment` for UI panels
- **WebAssembly (WASM)** — C/C++ image processing modules
- **GitHub Actions** — CI/CD auto deploy to GitHub Pages

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
│   │   ├── bar-actions.tsx  # Sidebar & toolbar actions
│   │   ├── event-bus.ts    # Global event bus
│   │   └── wasm-filter.ts  # WASM filter bindings
│   ├── text/
│   │   ├── text.tsx        # Text UI controller & property panels
│   │   └── text-transform.ts # Canvas text rendering, selection, curve
│   ├── image/
│   │   ├── image-upload.tsx  # Add Image modal (file / URL)
│   │   └── image-camera.tsx  # Capture from Camera modal
│   ├── panels/
│   │   ├── common/         # Color, Gradient, Texture, Opacity, Crop,
│   │   │                   # Rotate, Curve, Relative Position, Cutout,
│   │   │                   # Background sub-panel + shared PreactModal
│   │   └── text/           # Text property panels (shadow, stroke, 3D, ...)
│   └── ui/
│       ├── dropdown.ts     # Dropdown menu (real DOM)
│       ├── LayerList.tsx   # Layer list panel (Preact)
│       └── base/           # Shared Preact UI (panel-header, tab-bar, slider)
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

## Deployment

Push to `master` branch triggers GitHub Actions workflow:
1. Checkout → Install → `npm run build`
2. Upload `dist/` as artifact
3. Deploy to GitHub Pages

Repository: **https://github.com/Pixorig/Pixorig**

## License

Apache License Version 2.0
