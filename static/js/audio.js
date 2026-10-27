// Frontend requests audio data from Flask's /api/audio endpoint.
const $ = selector => document.querySelector(selector);
const audio = $("#audioElement");
const volumeControl = window.createAudioVolumeControl(audio, $("#volume"), $("#volumeValue"));
const snakeSeek = $("#snakeSeek");
const snakeFill = $("#snakeFill");
const snakePlayhead = $("#snakePlayhead");
const snakePath = snakeFill;
let snakeLength = 0;
if (snakePath) { try { snakeLength = snakePath.getTotalLength(); snakePath.style.strokeDasharray = snakeLength; snakePath.style.strokeDashoffset = snakeLength; } catch (_) {} }
let tracks = [], filtered = [], current = -1, category = "All Audios";
let shouldResumePlayback = false;
const playbackStorageKey = "bia-audio-playback";
const durationDetectionConcurrency = 3;
const fmt = value => { if (!Number.isFinite(value) || value < 0) return "0:00"; return `${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,"0")}`; };
const trackDuration = track => track.duration_seconds > 0 ? fmt(track.duration_seconds) : track.audio_url ? "Detecting…" : "--:--";
const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function savePlayback() {
  if (current < 0 || !tracks[current]) return;
  const state = {
    trackId: tracks[current].id,
    currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
    volume: volumeControl.getValue(),
    wasPlaying: shouldResumePlayback && !audio.ended
  };
  try {
    sessionStorage.setItem(playbackStorageKey, JSON.stringify(state));
  } catch (error) {
    console.error("Could not save audio playback state.", error);
  }
}

function restorePlayback() {
  let state;
  try {
    const saved = sessionStorage.getItem(playbackStorageKey);
    if (!saved) return;
    state = JSON.parse(saved);
  } catch (error) {
    console.error("Could not read saved audio playback state.", error);
    return;
  }

  if (!state || typeof state !== "object") return;
  const index = tracks.findIndex(track => track.id === state.trackId);
  if (index < 0) return;

  current = index;
  shouldResumePlayback = state.wasPlaying === true;
  const track = tracks[index];
  $("#playerTitle").textContent = track.title;
  $("#playerReciter").textContent = track.reciter;
  const art = $("#playerArt");
  art.style.backgroundImage = `linear-gradient(#063b2c22,#063b2c44),url("${track.image_url}")`;
  art.style.backgroundSize = "cover";
  art.style.backgroundPosition = "center";
  volumeControl.setValue(Number.isFinite(state.volume) ? state.volume : 0.8);
  renderPlaylist();
  audio.src = track.audio_url;
  audio.addEventListener("loadedmetadata", async () => {
    if (Number.isFinite(state.currentTime) && state.currentTime > 0) {
      audio.currentTime = Math.min(state.currentTime, audio.duration || state.currentTime);
    }
    if (state.wasPlaying !== true) {
      $("#playerStatus").textContent = "Playback position restored. Press play when you’re ready to continue.";
      return;
    }
    try {
      await audio.play();
      $("#playerStatus").textContent = "Playback resumed.";
    } catch (error) {
      $("#playerStatus").textContent = "Track and position restored. Your browser requires a tap to resume playback. Press Play to continue.";
      shouldResumePlayback = true;
      savePlayback();
      console.error("Automatic playback could not resume.", error);
    }
  }, { once: true });
  audio.load();
}

async function loadTracks() {
  try {
    const response = await fetch("/api/audio");
    if (!response.ok) throw new Error("API request failed");
    tracks = await response.json();
    filterTracks();
    renderPlaylist();
    restorePlayback();
    detectMissingDurations();
    if (current < 0) $("#playerStatus").textContent = "Connected to the database.";
  } catch (error) {
    $("#emptyMessage").textContent = "Could not load tracks. Check that the Flask server is running.";
    $("#emptyMessage").hidden = false;
    $("#playerStatus").textContent = "Audio catalogue unavailable.";
    console.error(error);
  }
}
function filterTracks() {
  const query = $("#searchInput").value.trim().toLowerCase();
  filtered = tracks.filter(t => (category === "All Audios" || t.category === category) && `${t.title} ${t.reciter}`.toLowerCase().includes(query));
  $("#trackCount").textContent = `${filtered.length} track${filtered.length === 1 ? "" : "s"}`;
  $("#emptyMessage").hidden = filtered.length > 0;
  renderPlaylist();
}
function renderPlaylist() {
  const playlistHtml = filtered.map(t => {
    const index = tracks.findIndex(track => track.id === t.id);
    return `<li class="${index===current?'current':''}"><img class="playlist-art" src="${safe(t.image_url)}" alt=""><div class="playlist-track"><button data-playlist="${index}">${safe(t.title)}</button><span class="playlist-reciter">${safe(t.reciter)}</span><span class="playlist-category"><strong>Category:</strong> ${safe(t.category)}</span></div><span class="playlist-duration">${trackDuration(t)}</span></li>`;
  }).join("");
  document.querySelectorAll("#playlist, #playerPlaylist").forEach(playlist => {
    playlist.innerHTML = playlistHtml;
  });
  document.querySelectorAll("[data-playlist]").forEach(b => b.addEventListener("click", () => playTrack(Number(b.dataset.playlist))));
}
function updateTrackDuration(track, duration) {
  if (!Number.isFinite(duration) || duration <= 0) return;
  const durationSeconds = Math.round(duration);
  if (track.duration_seconds === durationSeconds) return;
  track.duration_seconds = durationSeconds;
  filterTracks();
  renderPlaylist();
  // Duration is updated in this browser only; public API writes are disabled in v1.0.0.
}
function detectTrackDuration(track) {
  return new Promise(resolve => {
    const metadataAudio = new Audio();
    metadataAudio.preload = "metadata";
    let timeoutId;
    const finish = duration => {
      clearTimeout(timeoutId);
      metadataAudio.removeEventListener("loadedmetadata", onMetadata);
      metadataAudio.removeEventListener("error", onError);
      metadataAudio.removeAttribute("src");
      metadataAudio.load();
      resolve(duration);
    };
    const onMetadata = () => finish(Number.isFinite(metadataAudio.duration) ? metadataAudio.duration : null);
    const onError = () => {
      console.error(`Could not detect duration for "${track.title}".`, metadataAudio.error);
      finish(null);
    };
    metadataAudio.addEventListener("loadedmetadata", onMetadata, { once: true });
    metadataAudio.addEventListener("error", onError, { once: true });
    timeoutId = setTimeout(() => {
      console.error(`Timed out detecting duration for "${track.title}".`);
      finish(null);
    }, 15000);
    metadataAudio.src = track.audio_url;
    metadataAudio.load();
  });
}
async function detectMissingDurations() {
  const pending = tracks.filter(track =>
    track.audio_url && (!Number.isFinite(track.duration_seconds) || track.duration_seconds <= 0)
  );
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < pending.length) {
      const track = pending[nextIndex++];
      const duration = await detectTrackDuration(track);
      if (duration !== null) updateTrackDuration(track, duration);
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(durationDetectionConcurrency, pending.length) },
      worker
    )
  );
}
async function playTrack(index) {
  const track = tracks[index]; if (!track) return;
  shouldResumePlayback = true;
  current = index; $("#playerTitle").textContent = track.title; $("#playerReciter").textContent = track.reciter;
  const art = $("#playerArt"); art.style.backgroundImage = `linear-gradient(#063b2c22,#063b2c44),url("${track.image_url}")`; art.style.backgroundSize = "cover"; art.style.backgroundPosition = "center"; art.innerHTML = '<i data-lucide="headphones" aria-hidden="true">♫</i>'; window.renderLucideIcons();
  renderPlaylist(); audio.src = track.audio_url; audio.load(); $("#playerStatus").textContent = "Loading audio…";
  try {
    await audio.play(); $("#playerStatus").textContent = "Playing";
    if ("mediaSession" in navigator && "MediaMetadata" in window) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.reciter,
        album: "Breman Islamic Academy",
        artwork: track.image_url ? [{ src: new URL(track.image_url, location.href).href }] : [],
      });
      navigator.mediaSession.setActionHandler("play", () => {
        shouldResumePlayback = true;
        return audio.play();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        shouldResumePlayback = false;
        audio.pause();
      });
      navigator.mediaSession.setActionHandler("previoustrack", previous);
      navigator.mediaSession.setActionHandler("nexttrack", next);
    }
  } catch (error) { $("#playerStatus").textContent = "This demo URL could not play. Try another track or replace the URL."; console.error(error); }
}
function previous(){ if(tracks.length) playTrack((current-1+tracks.length)%tracks.length); }
function next(){ if(tracks.length) playTrack((current+1)%tracks.length); }
document.querySelectorAll("[data-category]").forEach(b => b.addEventListener("click", () => {
  category = b.dataset.category;
  document.querySelectorAll("[data-category]").forEach(x => x.classList.toggle("selected", x===b));
  filterTracks();
}));
$("#searchInput").addEventListener("input", filterTracks);
$("#playButton").addEventListener("click", async () => {
  if (!audio.src) return tracks.length && playTrack(0);
  if (audio.paused) {
    shouldResumePlayback = true;
    try { await audio.play(); } catch { $("#playerStatus").textContent = "Playback could not start."; }
  } else {
    shouldResumePlayback = false;
    audio.pause();
  }
});
$("#previousButton").addEventListener("click", previous);
$("#nextButton").addEventListener("click", next);
if (snakeSeek) {
  const seekFromPointer = event => {
    if (!Number.isFinite(audio.duration) || !snakeSeek.getBoundingClientRect().width) return;
    const rect = snakeSeek.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    audio.currentTime = percent * audio.duration;
  };
  snakeSeek.addEventListener("click", seekFromPointer);
  snakeSeek.addEventListener("keydown", event => {
    if (!Number.isFinite(audio.duration)) return;
    if (event.key === "ArrowRight") audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
    if (event.key === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - 5);
  });
}
audio.addEventListener("timeupdate", () => {
  $("#currentTime").textContent = fmt(audio.currentTime);
  if (Number.isFinite(audio.duration) && audio.duration > 0 && snakeLength && snakeFill) {
    const percent = Math.max(0, Math.min(1, audio.currentTime / audio.duration));
    snakeFill.style.strokeDasharray = snakeLength;
    snakeFill.style.strokeDashoffset = snakeLength * (1 - percent);
    if (snakePlayhead) snakePlayhead.setAttribute("transform", `translate(${percent * 592} 0)`);
    if (snakeSeek) snakeSeek.setAttribute("aria-valuenow", String(Math.round(percent * 100)));
  }
  savePlayback();
});
audio.addEventListener("loadedmetadata", () => {
  $("#duration").textContent = fmt(audio.duration);
  if (current >= 0) updateTrackDuration(tracks[current], audio.duration);
});
audio.addEventListener("play", () => { if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing"; shouldResumePlayback = true; window.setLucideIcon($("#playButton"), "pause", "Ⅱ"); $("#playButton").setAttribute("aria-label", "Pause"); $("#playButton").title = "Pause"; savePlayback(); });
audio.addEventListener("pause", () => { if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused"; window.setLucideIcon($("#playButton"), "play", "▶"); $("#playButton").setAttribute("aria-label", "Play"); $("#playButton").title = "Play"; savePlayback(); });
audio.addEventListener("ended", () => { shouldResumePlayback = false; next(); });
audio.addEventListener("error", () => { if(audio.src) $("#playerStatus").textContent = "Audio failed to load; check URL and connection."; });
window.addEventListener("pagehide", savePlayback);
loadTracks();
