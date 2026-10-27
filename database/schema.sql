-- Beginner schema: one row represents one audio track.
CREATE TABLE IF NOT EXISTS audio_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    reciter TEXT NOT NULL,
    category TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    image_url TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_audio_tracks_title
ON audio_tracks (title);
