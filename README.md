# Dual-marker discovery — showcase site

The submission website for **Combinatorial surface-marker targets for prostate cancer**, a Built with
Claude: Life Sciences (Research track, 2026) project. It presents the challenge and dataset, how
Claude Code and Claude Science were used, the scientific report, and an interactive explorer.

The science, the pipeline, and the report live in the companion repository
[`dual-marker-discovery`](https://github.com/wguesdon/dual-marker-discovery). The grounded Claude
assistant lives in [`dual-marker-discovery-app`](https://github.com/wguesdon/dual-marker-discovery-app).
This repository is the presentation layer only. The report and the explorer are copied in as static
assets under `public/`.

> **Status: skeleton.** Every page is structured and styled but the prose is a `TODO` block. Search
> the repo for `TODO` to find what is unwritten. Ported from
> [`reading-dna-base-by-base`](https://github.com/wguesdon/reading-dna-base-by-base).

## Stack

- [Astro](https://astro.build) static site.
- Deployed on Netlify (`netlify.toml`), and also baked into the app's container image so that one
  App Runner origin serves both the public site and the gated assistant.

## Develop

```bash
npm install
npm run dev      # local dev server on :4321, proxying /app and /api to the agent on :8080
npm run build    # static build to dist/
npm run preview  # preview the build
```

`astro.config.mjs` proxies `/app`, `/api`, `/login`, and `/healthz` to `http://localhost:8080` so the
same-origin layout of production is reproduced locally. Override with `AGENT_ORIGIN`.

## Pages

| Route | Page | State |
|---|---|---|
| `/` | Overview and headline result | skeleton |
| `/challenge` | The hackathon, the dataset, the biological question | skeleton |
| `/claude` | How Claude Code and Claude Science were used | skeleton |
| `/report` | The full scientific report (embedded) | live |
| `/explore` | Explore with Claude: the gated app, embedded | live |

There is one tool page, not two. `/explore` embeds the gated app, which is the pair explorer and the
grounded assistant in a single view. A separate public explorer page would duplicate that panel and
would have to serve the dataset unauthenticated to be worth anything, which defeats the access code.

## Generated assets

`public/report.html` is produced in `dual-marker-discovery` and copied here by `build_image.sh` in
the app repo. It is gitignored: it is a build output, not source. Until the first build, `/report`
embeds a blank frame.
