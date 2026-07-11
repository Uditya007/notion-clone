# Cora Workspace — Native macOS Desktop App Guide

We have configured a complete, production-ready **native macOS Desktop Application** setup using Electron (`titleBarStyle: 'hiddenInset'`), native macOS menus, keyboard shortcuts, and DMG packaging.

---

## 1. Prerequisites (First Time Only)

Install the Electron and packaging dependencies in your project:
```bash
npm install -D electron electron-builder
```

---

## 2. Run the Native macOS Desktop App Locally

Ensure your Next.js server is running (or start it in a terminal):
```bash
npm run dev
```

Then open a second terminal and launch the native macOS desktop app:
```bash
npm run desktop:dev
```
*This opens a native macOS window (`1400x900`) with inset traffic lights, native macOS dock integration, and keyboard shortcuts (`Cmd+N`, `Cmd+Shift+A`).*

---

## 3. Build a Standalone macOS Installer (.dmg / .app)

To package your app into a distributable `.dmg` installer or `.app` bundle for macOS (Apple Silicon M1/M2/M3/M4 & Intel x64):
```bash
npm run desktop:build
```
The resulting macOS installer and application bundle will be saved inside the `dist-desktop/` folder!
