"""Beginner Flask backend for the B.I.A. website."""
from flask import Flask, jsonify, redirect, request
import sqlite3
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from data.tracks import tracks

app = Flask(__name__)
app.config["SECRET_KEY"] = __import__("os").environ.get("SECRET_KEY", "local-development-only-change-me")
from routes.pages import pages
app.register_blueprint(pages)
DB_PATH = Path(__file__).with_name("bia.db")

# Example audio records. Replace these demo URLs with authorized recordings.


def connect_db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with connect_db() as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS audio_tracks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                reciter TEXT NOT NULL,
                category TEXT NOT NULL,
                audio_url TEXT NOT NULL,
                image_url TEXT NOT NULL,
                duration_seconds INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        db.execute("DROP INDEX IF EXISTS idx_audio_tracks_identity")
        db.execute(
            """
            DELETE FROM audio_tracks
            WHERE id NOT IN (
                SELECT MAX(id) FROM audio_tracks GROUP BY title
            )
            """
        )
        db.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_audio_tracks_title
            ON audio_tracks (title)
            """
        )
        for track in tracks:
            db.execute(
                """
                INSERT INTO audio_tracks
                (title, reciter, category, audio_url, image_url, duration_seconds)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(title) DO UPDATE SET
                    reciter = excluded.reciter,
                    category = excluded.category,
                    audio_url = excluded.audio_url,
                    image_url = excluded.image_url,
                    duration_seconds = excluded.duration_seconds
                """,
                track,
            )


def row_dict(row):
    return {key: row[key] for key in row.keys()}


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "message": "B.I.A. backend is running"})


@app.get("/service-worker.js")
def service_worker():
    response = app.send_static_file("service-worker.js")
    response.headers["Service-Worker-Allowed"] = "/"
    return response


@app.get("/api/audio")
def list_audio():
    category = request.args.get("category", "").strip()
    query = request.args.get("q", "").strip()
    sql, params = "SELECT * FROM audio_tracks WHERE 1=1", []
    if category and category != "All Audios":
        sql += " AND category = ?"
        params.append(category)
    if query:
        sql += " AND (title LIKE ? OR reciter LIKE ?)"
        params.extend([f"%{query}%", f"%{query}%"])
    sql += " ORDER BY id"
    with connect_db() as db:
        rows = db.execute(sql, params).fetchall()
    return jsonify([row_dict(row) for row in rows])


@app.patch("/api/audio/<int:track_id>")
def update_audio_duration(track_id):
    # Public release is read-only. Add authenticated admin controls in a later version.
    return jsonify({"error": "Audio catalogue updates are disabled in this public release."}), 405


@app.get("/api/audio/<int:track_id>/download")
def download_audio(track_id):
    with connect_db() as db:
        row = db.execute(
            "SELECT audio_url FROM audio_tracks WHERE id = ?", (track_id,)
        ).fetchone()
    if row is None:
        return jsonify({"error": "Audio track not found"}), 404

    parts = urlsplit(row["audio_url"])
    if parts.scheme not in {"http", "https"} or not parts.netloc:
        return jsonify({"error": "Audio URL is invalid"}), 400
    if parts.hostname == "res.cloudinary.com" and "/video/upload/" in parts.path:
        path = parts.path.replace("/video/upload/", "/video/upload/fl_attachment/", 1)
        return redirect(urlunsplit((parts.scheme, parts.netloc, path, parts.query, parts.fragment)))

    return redirect(row["audio_url"])


@app.post("/api/audio")
def add_audio():
    # Public release is read-only until authenticated administration is implemented.
    return jsonify({"error": "Adding audio is disabled in this public release."}), 405


init_db()


if __name__ == "__main__":
    # Debug mode is for local learning only.
    import os
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=False)
