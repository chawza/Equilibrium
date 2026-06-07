# Equilibrium

A local-first personal budgeting desktop app. No backend, no accounts — data lives as a SQLite file on your machine. Create monthly budgets, record inflows and outflows, tag transactions, and review spending over time.

Built with [Tauri v2](https://tauri.app), Svelte 5, and SQLite.

---

## Download

Get the latest release from the [Releases page](https://github.com/nabeelkm/equilibrium/releases).

| Platform | Bundle |
|---|---|
| macOS (Apple Silicon) | `.dmg` / `.app` |
| Windows | `.msi` / `.exe` |
| Linux | `.AppImage` / `.deb` |

---

## Install / First Launch (Unsigned Build)

This app ships **unsigned** — code signing and notarization are not configured for this release (Apple Developer Program costs $99/yr; Windows EV certs $400+/yr). Your OS will show a one-time security warning on first launch. This is expected.

### macOS

**Option A — right-click method:**
1. Double-click the `.dmg` and drag `Equilibrium.app` to `/Applications`.
2. Right-click (or Control-click) `Equilibrium.app` → **Open**.
3. Confirm the "unidentified developer" dialog → **Open**.

**Option B — System Settings:**
1. Try to open the app normally (it will be blocked).
2. Go to **System Settings → Privacy & Security**.
3. Scroll to the bottom and click **Open Anyway** next to Equilibrium.

After dismissing the prompt once, future launches work normally.

### Windows

1. Run the `.msi` or `.exe` installer.
2. When SmartScreen appears, click **More info** → **Run anyway**.

After the one-time prompt, the app installs and launches normally.

### Linux

```bash
# AppImage — make executable and run
chmod +x Equilibrium_*.AppImage
./Equilibrium_*.AppImage

# .deb — install via dpkg
sudo dpkg -i equilibrium_*.deb
```

---

## Building from Source

**Requirements:** Rust (stable), Node.js 20+, platform WebView dependencies.

```bash
# Install frontend dependencies
npm ci

# Development (hot-reload)
npm run tauri dev

# Production build
npm run tauri build
```

Linux also requires: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`

---

## License

MIT
