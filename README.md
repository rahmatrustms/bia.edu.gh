# B.I.A Website

This repository contains the B.I.A (Breman Islamic Academy) website project.

## Overview

The website includes:
- a media player for Quran audio
- a media library and playlist UI
- audio playback controls, favorites, and downloads
- pages for reciters, videos, and information

## Structure

- `index.html` — main landing page
- `pages/` — additional content pages such as Quran playlists, reciters, and media library
- `css/` — stylesheets for UI, audio player, and media library
- `js/` — JavaScript code for player engine, UI, playlist rendering, and audio data

## Key files

- `js/player.js` — global audio player engine
- `js/player-ui.js` — UI bindings and player controls
- `js/playlist.js` — playlist rendering and click handling
- `js/quran-data.js` — Quran audio metadata and default artwork
- `css/audioPlayer.css` — audio player styling

## Local setup

Open `index.html` or pages in a browser to run the site locally. No build step is required.

## License

This project is licensed under the [MIT License](LICENSE).

## Notes

- The audio player uses browser `Audio` and localStorage for persisted state.
- Some pages load nested content via `iframe`.
- Artwork defaults are applied when audio data items lack an `artwork` URL.

## Troubleshooting

- If playback does not start on first click, try reloading the page.
- Open the browser DevTools console for runtime errors and missing resource warnings.
