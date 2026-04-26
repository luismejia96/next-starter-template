# Next.js Framework Starter

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/next-starter-template)

<!-- dash-content-start -->

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app). It's deployed on Cloudflare Workers as a [static website](https://developers.cloudflare.com/workers/static-assets/).

This template uses [OpenNext](https://opennext.js.org/) via the [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare), which works by taking the Next.js build output and transforming it, so that it can run in Cloudflare Workers.

<!-- dash-content-end -->

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/next-starter-template
```

A live public deployment of this template is available at [https://next-starter-template.templates.workers.dev](https://next-starter-template.templates.workers.dev)

## Getting Started

First, run:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

Then run the development server (using the package manager of your choice):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Deploying To Production

| Command                           | Action                                       |
| :-------------------------------- | :------------------------------------------- |
| `npm run build`                   | Build your production site                   |
| `npm run preview`                 | Preview your build locally, before deploying |
| `npm run build && npm run deploy` | Deploy your production site to Cloudflare    |

## Map prototype (private)

### What was added

An interactive, private soil/landscape risk map at `/map`.

| File | Purpose |
| :--- | :------ |
| `src/app/map/page.tsx` | Client-side Leaflet map with layer toggles, feature inspector, and GeoJSON export |
| `src/app/map/map.css` | Styles for the map container, legend, and inspector panel |
| `src/app/map/unauthorized/page.tsx` | Lightweight 401 page served by middleware |
| `src/app/api/map-auth/route.ts` | Edge API route that validates `MAP_VIEW_SECRET` |
| `src/middleware.ts` | Next.js Edge middleware that gates every `/map` request |
| `src/lib/map-utils.ts` | Turf.js helpers: risk score, centroid, area, choropleth colours |
| `public/data/soil-samples.geojson` | Synthetic sample dataset (8 features – polygons + points) |

**Why Leaflet + Turf.js?**  
Leaflet renders OSM tiles without an API key, keeping the prototype free and self-contained. Turf.js provides lightweight spatial analysis (centroid, area, risk scoring) entirely in the browser so no server-side geo stack is required at this stage.

**Why `MAP_VIEW_SECRET`?**  
The map is intended for private testing before public release. The secret gate prevents accidental public exposure without requiring a full OAuth setup at the prototype stage.

### Feature properties schema

```json
{
  "id":                  "string  – unique zone/sample identifier",
  "soil_type":           "string  – clay | sand | silt | loam",
  "slope_pct":           "number | null  – percent slope; null if unknown",
  "slope_source":        "string  – 'estimated' | 'DEM'",
  "risk_score":          "number  – 0..100 (recomputed client-side; example values in file)",
  "recommended_action":  "string  – plain-language infrastructure recommendation",
  "last_survey_date":    "string  – YYYY-MM-DD",
  "source":              "string  – data origin description"
}
```

### Running locally

```bash
# 1. Install dependencies (includes leaflet, @turf/turf)
npm install

# 2. Create .env.local and set the secret (do NOT commit this file)
#    If .env.local already exists, add MAP_VIEW_SECRET manually instead.
echo "MAP_VIEW_SECRET=some-strong-random-value" > .env.local

# 3. Start the dev server
npm run dev

# 4. Open the map in a browser after setting the cookie
# Option A – use curl to confirm the API check works:
curl -H "X-MAP-SECRET: some-strong-random-value" http://localhost:3000/api/map-auth
# → {"ok":true}

# Option B – set the cookie in DevTools (Application → Cookies):
#   Name: map_secret   Value: some-strong-random-value   Path: /
# Then open http://localhost:3000/map
```

### Deploying

**Cloudflare Workers / OpenNext**

```bash
# Set the secret once (you will be prompted to enter the value):
wrangler secret put MAP_VIEW_SECRET

# Build and deploy:
npm run deploy
```

**Vercel**

1. Go to your project → **Settings → Environment Variables**.
2. Add `MAP_VIEW_SECRET` with a strong random value.
3. Redeploy.

### Security notes

- **No secret values are committed to the repository.** All code that needs the secret reads `process.env.MAP_VIEW_SECRET`.
- `MAP_VIEW_SECRET` is a convenience gate for private testing. For stronger production security use **Cloudflare Access / Zero Trust** (zero-config SSO, IP rules) or **OAuth** (GitHub/Google). See [Cloudflare Access docs](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/) for setup.
- Do **not** commit real sensitive geodata (PII, private survey data, licensed datasets) to this repository. Store production data in Cloudflare R2 / AWS S3 with signed URLs, or use a private vector tileset service.

### Scaling notes

| Concern | Recommendation |
| :------ | :------------- |
| Large datasets | Convert GeoJSON to vector tiles ([Tippecanoe](https://github.com/felt/tippecanoe)) and serve via a tile CDN or Cloudflare R2 |
| Accurate slope | Replace `slope_pct` estimates with server-side DEM processing (GDAL, PDAL, or PostGIS `ST_Slope`) |
| Many users / auth | Cloudflare Access (Workers + Teams) or OAuth (GitHub sign-in) |
| Heavy analysis | Move Turf.js processing server-side or to a PostGIS-backed API |
| Real geodata | Serve from R2/S3 with signed URLs; never commit sensitive geometry to the repo |

---

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!
