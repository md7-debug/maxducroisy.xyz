# Max Ducroisy personal site

A small static personal site built with plain HTML, CSS and JavaScript. There is no framework or server-side application.

The homepage is a compact personal space. Writing, projects, videos and notes grow through a searchable Browse view backed by one content catalogue.

## Add writing, projects, videos or notes

Add one entry to `content.json`. Use `writing`, `project`, `video` or `note` for its `kind`. The homepage modes and Browse view create their filters from the available content automatically; the plain-text edition and RSS feed use the same catalogue.

Use an ISO date (`YYYY-MM-DD`) when it is known. Browse initially shows 12 entries on desktop and 8 on mobile, with search and progressive loading for longer archives.

Each entry may use:

- `writing` for an article;
- `project` for a product or open-source project;
- `video` for a talk, demo or film;
- `note` for a personal note.

The top-level modes and Browse filters update automatically when a new kind appears.

## Generate text editions

```sh
SITE_URL=https://maxducroisy.xyz python3 build.py
```

This creates:

- `feed.xml`
- `llms.txt`
- `index.txt`

## Local preview

```sh
python3 build.py
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173`.

## Deployment

The GitHub Actions workflow validates every pull request and deploys `main` to the existing Cloudflare Pages project. It requires repository secrets named `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.

## Licence

Software source is licensed under `AGPL-3.0-only`. Personal prose, identity and original brand assets are excluded from that grant. See `LICENSE`, `COPYRIGHT.md` and `THIRD_PARTY_NOTICES.md`.
