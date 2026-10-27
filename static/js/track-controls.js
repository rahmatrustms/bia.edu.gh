const trackElements = [...document.querySelectorAll("[data-track-id][data-audio-url]")];
const formatTrackDuration = seconds =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function updateTrackDuration(trackId, duration) {
  if (!Number.isFinite(duration) || duration <= 0) return;
  const seconds = Math.round(duration);
  const matchingElements = trackElements.filter(element => element.dataset.trackId === trackId);
  const durationChanged = matchingElements.some(
    element => Number(element.dataset.trackDuration) !== seconds
  );
  matchingElements.forEach(element => {
    element.dataset.trackDuration = String(seconds);
    element.querySelectorAll("[data-duration-label]").forEach(label => {
      label.textContent = formatTrackDuration(seconds);
    });
  });
  if (!durationChanged) return;

  // Duration is updated in the current page only; API writes are disabled in v1.0.0.
}

function detectTrackDuration(element) {
  return new Promise(resolve => {
    const audio = new Audio();
    audio.preload = "metadata";
    let timeoutId;
    const finish = duration => {
      clearTimeout(timeoutId);
      audio.removeEventListener("loadedmetadata", onMetadata);
      audio.removeEventListener("error", onError);
      audio.removeAttribute("src");
      audio.load();
      resolve(duration);
    };
    const onMetadata = () => finish(Number.isFinite(audio.duration) ? audio.duration : null);
    const onError = () => {
      console.error(`Could not detect duration for track ${element.dataset.trackId}.`, audio.error);
      finish(null);
    };
    audio.addEventListener("loadedmetadata", onMetadata, { once: true });
    audio.addEventListener("error", onError, { once: true });
    timeoutId = setTimeout(() => {
      console.error(`Timed out detecting duration for track ${element.dataset.trackId}.`);
      finish(null);
    }, 20000);
    audio.src = element.dataset.audioUrl;
  });
}

async function detectMissingTrackDurations() {
  const missing = trackElements.filter(element => Number(element.dataset.trackDuration) <= 0);
  const unique = [...new Map(missing.map(element => [element.dataset.trackId, element])).values()];
  let next = 0;
  const worker = async () => {
    while (next < unique.length) {
      const element = unique[next++];
      const duration = await detectTrackDuration(element);
      if (duration !== null) updateTrackDuration(element.dataset.trackId, duration);
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, unique.length) }, worker));
}

const homeTrackCards = [...document.querySelectorAll(".home-audio-card[data-audio-url]")];
if (homeTrackCards.length) {
  const player = new Audio();
  const mediaSession = "mediaSession" in navigator ? navigator.mediaSession : null;
  let activeCard = null;
  const setMediaActionHandler = (action, handler) => {
    if (!mediaSession) return;
    try {
      mediaSession.setActionHandler(action, handler);
    } catch (error) {
      console.warn(`Media action "${action}" is not supported.`, error);
    }
  };
  const setPlayState = (card, playing) => {
    const button = card.querySelector("[data-track-play]");
    if (!button) return;
    button.setAttribute("aria-label", `${playing ? "Pause" : "Play"} ${card.querySelector("h3").textContent}`);
    button.title = playing ? "Pause" : "Play";
    window.setLucideIcon(button, playing ? "pause" : "play", playing ? "Ⅱ" : "▶");
  };
  const updateMediaSession = card => {
    if (!mediaSession || !("MediaMetadata" in window)) return;
    const image = card.querySelector("img")?.currentSrc || card.querySelector("img")?.src;
    mediaSession.metadata = new MediaMetadata({
      title: card.querySelector("h3").textContent.trim(),
      artist: card.querySelector(".home-audio-info p").textContent.trim(),
      album: "Breman Islamic Academy",
      artwork: image ? [{ src: new URL(image, location.href).href }] : [],
    });
  };
  const playCard = async card => {
    if (activeCard && activeCard !== card) setPlayState(activeCard, false);
    activeCard = card;
    updateMediaSession(card);
    if (player.src !== new URL(card.dataset.audioUrl, location.href).href) {
      player.src = card.dataset.audioUrl;
      player.load();
    }
    try {
      await player.play();
      card.querySelector("[data-playback-status]").textContent = "";
    } catch (error) {
      setPlayState(card, false);
      card.querySelector("[data-playback-status]").textContent = "Playback unavailable";
      console.error(`Could not play track ${card.dataset.trackId}.`, error);
    }
  };
  homeTrackCards.forEach(card => {
    card.querySelector("[data-track-play]").addEventListener("click", async () => {
      if (activeCard === card && !player.paused) {
        player.pause();
        return;
      }
      await playCard(card);
    });
  });
  player.addEventListener("play", () => {
    if (mediaSession) mediaSession.playbackState = "playing";
    if (activeCard) setPlayState(activeCard, true);
  });
  player.addEventListener("pause", () => {
    if (mediaSession) mediaSession.playbackState = "paused";
    if (activeCard) setPlayState(activeCard, false);
  });
  player.addEventListener("ended", () => { if (activeCard) setPlayState(activeCard, false); });
  player.addEventListener("error", () => {
    if (activeCard) {
      if (mediaSession) mediaSession.playbackState = "paused";
      setPlayState(activeCard, false);
      activeCard.querySelector("[data-playback-status]").textContent = "Track unavailable";
    }
  });
  setMediaActionHandler("play", () => activeCard && playCard(activeCard));
  setMediaActionHandler("pause", () => player.pause());
  setMediaActionHandler("previoustrack", () => {
    const index = homeTrackCards.indexOf(activeCard);
    if (index >= 0) return playCard(homeTrackCards[(index - 1 + homeTrackCards.length) % homeTrackCards.length]);
  });
  setMediaActionHandler("nexttrack", () => {
    const index = homeTrackCards.indexOf(activeCard);
    if (index >= 0) return playCard(homeTrackCards[(index + 1) % homeTrackCards.length]);
  });
}

if (trackElements.length) detectMissingTrackDurations();
