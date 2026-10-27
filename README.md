# B.I.A. Full-Stack Website — Modular Edition

A learning-focused Flask + SQLite project for Breman Islamic Academy (B.I.A.). It preserves the existing audio database and adds a reciters directory, reciter detail pages, a responsive gallery, and a curved snake-style playback progress line.

## Run on Windows
1. Extract the ZIP and open the `bia-fullstack-beginner` folder in VS Code.
2. Open a terminal in that folder.
3. Create and activate a virtual environment:
   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python app.py
   ```
4. Open `http://127.0.0.1:5000`.

For phone testing, connect the phone and laptop to the same hotspot or Wi-Fi and open `http://LAPTOP-IP:5000` on the phone. Find the laptop IP with `ipconfig`.

## Pages
- `/` — existing homepage
- `/audio` — media library and player
- `/gallery` — responsive gallery with search, filters and image preview
- `/api/health`, `/api/audio` — existing API endpoints

## Modular structure
- `app.py` registers the Flask app and existing API.
- `config.py` stores project paths and configuration.
- `database/db.py` centralizes SQLite connections and queries.
- `routes/pages.py` contains page routes.
- `templates/` contains each page.
- `static/css/style.css` contains shared and page-specific styles.
- `static/js/` contains separate behavior for the media library, reciters, reciter detail, gallery, and navigation.

## Database preservation
The supplied `bia.db` was preserved in this package. Back it up before experimenting. Do not delete it to refresh tracks. The current gallery cards are demonstration entries and should be connected to an actual gallery table/admin upload workflow before public use.

## Cloudinary and deployment security
This project does not yet implement Cloudinary auto-sync or a secure webhook endpoint. Those require server-side credentials, signature validation, and deployment configuration. Do not expose Flask's development server publicly. The current write API is a learning prototype and needs authentication and validation before public deployment.


## Managing the audio catalogue

Starter audio records are maintained in `data/tracks.py` as the `tracks` list. Each entry is a tuple in this order: title, reciter, category, audio URL, cover image URL, duration in seconds. The Flask app imports this list and synchronizes its entries into SQLite at startup. Keep titles unique because the database uses the title to update existing records. The `/api/audio` endpoint reads the database, which is what the audio page displays.
