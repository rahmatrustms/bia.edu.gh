"""Page routes for the B.I.A. website."""

from collections import defaultdict
import sqlite3
from pathlib import Path

from flask import Blueprint, render_template, abort

pages = Blueprint("pages", __name__)
DB_PATH = Path(__file__).resolve().parents[1] / "bia.db"


def _all_tracks():
    with sqlite3.connect(DB_PATH) as db:
        db.row_factory = sqlite3.Row
        return [
            dict(row)
            for row in db.execute(
                "SELECT * FROM audio_tracks ORDER BY id"
            ).fetchall()
        ]


def _reciter_data(tracks):
    grouped = defaultdict(list)

    for track in tracks:
        grouped[track["reciter"]].append(track)

    result = []

    for name, items in grouped.items():
        image = next(
            (t.get("image_url") for t in items if t.get("image_url")),
            "",
        )
        category = next(
            (t.get("category") for t in items if t.get("category")),
            "Audio",
        )

        result.append({
            "name": name,
            "display_name": name,
            "image_url": image,
            "tracks": len(items),
            "category": category,
            "search_text": (
                f"{name} {category} "
                f"{' '.join(t.get('title', '') for t in items)}"
            ),
        })

    return result


@pages.get("/")
def home():
    tracks = _all_tracks()
    return render_template(
        "index.html",
        tracks=tracks[:8],
        all_tracks=tracks,
    )


@pages.get("/gallery")
def gallery():
    tracks = _all_tracks()
    return render_template(
        "gallery.html",
        reciters=_reciter_data(tracks),
        tracks=tracks,
    )


@pages.get("/audio")
def media_library():
    tracks = _all_tracks()
    categories = sorted({
        t.get("category", "Audio") for t in tracks
    })

    return render_template(
        "media_library.html",
        reciters=_reciter_data(tracks),
        categories=categories,
        tracks=tracks,
    )


@pages.get("/audio/reciter/<path:reciter_name>")
def media_reciter_detail(reciter_name):
    tracks = _all_tracks()

    matching = [
        t for t in tracks
        if t["reciter"].casefold() == reciter_name.casefold()
    ]

    if not matching:
        abort(404)

    all_reciters = _reciter_data(tracks)
    portrait = next(
        (t.get("image_url") for t in matching if t.get("image_url")),
        "",
    )
    related = [
        p for p in all_reciters
        if p["name"].casefold() != reciter_name.casefold()
    ][:4]

    return render_template(
        "media_reciter_detail.html",
        reciter=matching[0]["reciter"],
        tracks=matching,
        portrait=portrait,
        reciters=all_reciters,
        related_reciters=related,
    )