# Call Break Calculator

Simple round-by-round score calculator for the card game Call Break.

## Features

- 4-player round scoring
- Supports `achieved = 0` (fixes the reference site limitation)
- Auto-calculates per-round and cumulative totals
- Undo last round
- Local save in browser (`localStorage`)
- Mobile-friendly UI with neon style similar to your `online_two_player` project

## Scoring Used

For each player in a round:

- If `achieved >= call`: `score = call + 0.1 * (achieved - call)`
- If `achieved < call`: `score = -call`

Also validated: total achieved tricks by all players must be exactly `13`.

## Run Locally

Open `index.html` directly in your browser.

## Deploy to GitHub Pages

1. Create a new GitHub repo (for example: `callbreak-calculator`)
2. Push this folder to the repo on branch `main`
3. In GitHub repo settings, open **Pages**
4. Set **Build and deployment** source to **GitHub Actions**
5. Push to `main`; workflow `.github/workflows/pages.yml` will publish the site

After deploy, URL will be:

`https://<your-username>.github.io/<repo-name>/`
