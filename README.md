# Recycle Rewards

Browser-only MVP for the proposed ALDI Nord Berlin recycling rewards pilot.

The app simulates two views:

- **Customer kiosk:** return accepted or rejected packaging, earn points, and redeem a demo voucher.
- **Pilot store view:** inspect returns, points, kiosk fill level, material mix, and collection readiness.

There is no backend, account system, real voucher, barcode scanner, image recognition, or ALDI integration. Demo data is stored in the current browser with `localStorage`.

## Run locally

```bash
git clone https://github.com/katooling/recycle-rewards.git
cd recycle-rewards
npm install
python3 -m http.server 8000
```

Open <http://127.0.0.1:8000>.

The HTTP server is required because the app uses JavaScript modules.

## Test

```bash
npm run test:e2e:chromium
```

Playwright starts its own local static server on port `4173`.

## GitHub Pages

The project has no production build step. Configure GitHub Pages to deploy the `main` branch from the repository root.

## Demo rules

- Accepted items earn one point.
- Ten points redeem one €1 demo voucher.
- The demo kiosk capacity is ten accepted items.
- Collection is recommended at 80% capacity.

These are prototype values and are defined in `js/catalog.js`.
