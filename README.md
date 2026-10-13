# The Stemify Way

Standalone cinematic STEMIFY page with React, TypeScript, GSAP, Three.js and 1080p scroll-controlled videos.

## Development

Use Node.js 24, then run `npm ci` and `npm run dev`. Open the server's /thestemifyway/ path. Run `npm run build` for the production build in dist.

## Deployment

GitHub Pages publishes the main branch through the included Actions workflow. Set Settings → Pages → Source to GitHub Actions. The public address is https://stemifycanada-sketch.github.io/thestemifyway/.

## Contents

The repository includes the editable page source, fonts through npm dependencies, image and video assets under public, dependency lockfile and build configuration. The separate new STEMIFY homepage is maintained in another project flow and is not part of this standalone page.

Plan, review, contact and assessment integration placeholders remain as displayed in the approved preview; no testimonial or commercial details are fabricated.

## Family portal backend

The integrated `/portal` supports verified parent registration, separate child logins, class scheduling, preparation notes, teacher-reviewed lesson summaries, and signed Zoom AI Companion webhooks. See [the setup and deployment guide](docs/portal-setup.md) for local demo accounts, staff access, PostgreSQL, email and Zoom configuration.

Use `npm run dev:portal` for the complete local application and `npm run test:backend` for the backend checks. Production requires the environment settings in `.env.example` before this branch is deployed.
