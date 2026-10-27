const audio = document.getElementById("mediaAudio");
const volumeControl = window.createAudioVolumeControl(
  audio,
  document.getElementById("mediaVolume"),
  document.getElementById("mediaVolumeValue")
);
const rows = [...document.querySelectorAll(".media-track-row")];
const playButton = document.getElementById("mediaPlay");
const seekBar = document.getElementById("mediaSeek");
const waveTrack = document.getElementById("mediaWaveTrack");
const waveFill = document.getElementById("mediaWaveFill");
const waveHead = document.getElementById("mediaWaveHead");
let currentIndex = 0;
let shuffleEnabled = false;
let repeatEnabled = false;
let waveLength = 0;
let waveAnimationFrame = 0;
const straightWavePath = "M4 22 L596 22";
const mediaSession = "mediaSession" in navigator ? navigator.mediaSession : null;


function setWaveform(progress, reset = false) {
  const p = Math.max(0, Math.min(1, progress || 0));

  // Reset to a straight line before playback or after a track ends.
  if (reset || p <= 0) {
    waveTrack.setAttribute("d", straightWavePath);
    waveFill.setAttribute("d", straightWavePath);
    waveHead.setAttribute("transform", "translate(0 0)");
  } else {
    const points = [];
    const samples = 240;

    // The snake becomes more visible as the track progresses.
    const amplitude = 8 * Math.min(8, p * 3);

    for (let i = 0; i <= samples; i++) {
      const x = 4 + (592 * i / samples);
      const position = i / samples;

      // Keep the unplayed section straight.
      const waveProgress = Math.max(
        0,
        Math.min(1, (p - position) * 12)
      );

      const y =
        22 +
        Math.sin((x - 4) / 12) *
        amplitude *
        waveProgress;

      points.push(
        `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`
      );
    }

    const path = points.join(" ");

    waveTrack.setAttribute("d", path);
    waveFill.setAttribute("d", path);

    // Move the playhead with the audio progress.
    waveHead.setAttribute(
      "transform",
      `translate(${p * 592} 0)`
    );
  }

  // Keep the filled section synchronized with playback progress.
  try {
    waveLength = waveFill.getTotalLength();
    waveFill.style.strokeDasharray = String(waveLength);
    waveFill.style.strokeDashoffset = String(
      waveLength * (1 - p)
    );
  } catch (error) {
    console.warn("Could not update the waveform.", error);
  }
}


setWaveform(0, true);

const formatTime = value => {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
};

function setStatus(message) {
  const status = document.getElementById("mediaPlayerStatus");

  if (status) {
    status.textContent = message;
  }
}

function updateMediaSession(row) {
  if (!mediaSession || !("MediaMetadata" in window)) return;
  const image = row.dataset.image;
  mediaSession.metadata = new MediaMetadata({
    title: row.dataset.title,
    artist: row.querySelector(".media-track-title small")?.textContent.trim() || "",
    album: "Breman Islamic Academy",
    artwork: image ? [{ src: new URL(image, location.href).href }] : [],
  });
}

function setMediaActionHandler(action, handler) {
  if (!mediaSession) return;
  try {
    mediaSession.setActionHandler(action, handler);
  } catch (error) {
    console.warn(`Media action "${action}" is not supported.`, error);
  }
}

function updateProgress() {
  const duration = audio.duration;
  const currentTime = audio.currentTime;
  document.getElementById("mediaCurrentTime").textContent = formatTime(currentTime);
  document.getElementById("mediaDuration").textContent = formatTime(duration);
  if (!Number.isFinite(duration) || duration <= 0) return;
  const progress = Math.max(0, Math.min(1, currentTime / duration));
  setWaveform(progress, false);
  seekBar.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
}

function selectTrack(index, autoplay = true) {
  if (!rows.length) return;
  currentIndex = (index + rows.length) % rows.length;
  const row = rows[currentIndex];
  rows.forEach((item, itemIndex) => {
    item.classList.toggle("is-current", itemIndex === currentIndex);
    item.setAttribute("aria-current", itemIndex === currentIndex ? "true" : "false");
  });
  document.getElementById("mediaCurrentTitle").textContent = row.dataset.title;
  document.getElementById("mediaCurrentArt").src = row.dataset.image;
  updateMediaSession(row);
  audio.src = row.dataset.src;
  audio.load();
  setWaveform(0, true);
  updateProgress();
  setStatus(autoplay ? "Loading track…" : "Track selected.");
  if (autoplay) audio.play().catch(() => setStatus("Playback could not start. Press play to try again."));
}

function nextTrack() {
  if (!rows.length) return;
  const nextIndex = shuffleEnabled && rows.length > 1
    ? (currentIndex + 1 + Math.floor(Math.random() * (rows.length - 1))) % rows.length
    : currentIndex + 1;
  selectTrack(nextIndex);
}

function previousTrack() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  selectTrack(currentIndex - 1);
}

playButton.addEventListener("click", async () => {
  if (audio.paused) {
    try {
      await audio.play();
    } catch (_) {
      setStatus("Playback could not start. Try another track.");
    }
  } else {
    audio.pause();
  }
});

document.getElementById("mediaPrevious").addEventListener("click", previousTrack);
document.getElementById("mediaNext").addEventListener("click", nextTrack);
document.getElementById("mediaShuffle").addEventListener("click", event => {
  shuffleEnabled = !shuffleEnabled;
  event.currentTarget.classList.toggle("active", shuffleEnabled);
  event.currentTarget.setAttribute("aria-pressed", String(shuffleEnabled));
});
document.getElementById("mediaRepeat").addEventListener("click", event => {
  repeatEnabled = !repeatEnabled;
  audio.loop = repeatEnabled;
  event.currentTarget.classList.toggle("active", repeatEnabled);
  event.currentTarget.setAttribute("aria-label", repeatEnabled ? "Repeat on" : "Repeat off");
  event.currentTarget.title = repeatEnabled ? "Repeat on" : "Repeat off";
  event.currentTarget.setAttribute("aria-pressed", String(repeatEnabled));
});
rows.forEach((row, index) => row.addEventListener("click", () => selectTrack(index)));

function seekTo(clientX) {
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
  const bounds = seekBar.getBoundingClientRect();
  if (!bounds.width) return;
  const progress = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
  audio.currentTime = progress * audio.duration;
}

let draggingSeek = false;
seekBar.addEventListener("pointerdown", event => {
  draggingSeek = true;
  seekBar.setPointerCapture?.(event.pointerId);
  seekTo(event.clientX);
});
seekBar.addEventListener("pointermove", event => {
  if (draggingSeek) seekTo(event.clientX);
});
function stopSeeking() { draggingSeek = false; }
seekBar.addEventListener("pointerup", stopSeeking);
seekBar.addEventListener("pointercancel", stopSeeking);
seekBar.addEventListener("click", event => seekTo(event.clientX));
seekBar.addEventListener("keydown", event => {
  if (!Number.isFinite(audio.duration)) return;
  if (event.key === "ArrowRight") audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
  else if (event.key === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - 5);
  else if (event.key === "Home") audio.currentTime = 0;
  else if (event.key === "End") audio.currentTime = audio.duration;
  else return;
  event.preventDefault();
});


audio.addEventListener("timeupdate", updateProgress);
audio.addEventListener("loadedmetadata", updateProgress);

audio.addEventListener("canplay", () => {
  if (audio.paused && !audio.ended && audio.currentSrc) {
    setStatus("Ready to play.");
  }
});

function animateWaveWhilePlaying() {
  updateProgress();

  if (!audio.paused && !audio.ended) {
    waveAnimationFrame =
      window.requestAnimationFrame(animateWaveWhilePlaying);
  } else {
    waveAnimationFrame = 0;
  }
}

audio.addEventListener("play", () => {
  if (!waveAnimationFrame) {
    waveAnimationFrame =
      window.requestAnimationFrame(animateWaveWhilePlaying);
  }

  if (mediaSession) {
    mediaSession.playbackState = "playing";
  }

  window.setLucideIcon(playButton, "pause", "Ⅱ");
  playButton.setAttribute("aria-label", "Pause");
  playButton.title = "Pause";

  setStatus("Playing");
});

audio.addEventListener("pause", () => {
  if (waveAnimationFrame) {
    window.cancelAnimationFrame(waveAnimationFrame);
    waveAnimationFrame = 0;
  }

  if (mediaSession) {
    mediaSession.playbackState = "paused";
  }

  window.setLucideIcon(playButton, "play", "▶");
  playButton.setAttribute("aria-label", "Play");
  playButton.title = "Play";

  if (!audio.ended && audio.currentSrc) {
    setStatus("Paused");
  }
});


audio.addEventListener("ended", () => {
  if (repeatEnabled) return;

  nextTrack();
});


audio.addEventListener("error", () => setStatus("This recording could not be loaded."));

if (mediaSession) {
  setMediaActionHandler("play", () => audio.play());
  setMediaActionHandler("pause", () => audio.pause());
  setMediaActionHandler("previoustrack", previousTrack);
  setMediaActionHandler("nexttrack", nextTrack);
}
if (rows.length) {
  updateMediaSession(rows[0]);
  setStatus("Choose a track or press play.");
} else {
  setStatus("No recordings available.");
}
