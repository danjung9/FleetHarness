# AppYard branding

The AppYard partner handoff supplies the anchor mark and outlined APPYARD logo. The artwork uses navy `#081F35` and gold `#E1B75B`; the application keeps its existing interface palette.

| Location | Use |
| --- | --- |
| `branding/` | Original SVG and PNG logos, icon masters, preview, and wordmark font license |
| `src/assets/brand/mark-gold.svg` | Shared `Mark` component in the sidebar, Home, and loading view |
| `src/assets/brand/logo-on-dark.svg` | Header logo on dark surfaces |
| `public/` | SVG/ICO/PNG favicons, Apple touch icon, app icons, and web manifest |
| `build/icon.png`, `build/icon.icns` | Desktop packaging icons |

Run `npm run icons` after replacing the master assets in `branding/`. This dependency-free script copies them to the renderer, browser, and desktop locations. The legacy shell and Swift icon scripts also use the supplied artwork.

The wordmark is outlined, so it does not require a font at runtime. Its DejaVu Sans Bold license is in `branding/WORDMARK-LICENSE.txt`. The gold mark is decorative beside visible AppYard text; the header logo has an accessible AppYard label.

`index.html` uses Vite's `%BASE_URL%` for the icon and manifest links. The manifest uses relative icon paths so it also works when the app is built under a subpath. Electron loads the app icon from `public/` during development and `dist/` when packaged.
