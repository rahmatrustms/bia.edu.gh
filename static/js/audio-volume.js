window.createAudioVolumeControl = (audio, range, output) => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const clamp = value => Math.max(0, Math.min(2, Number(value) || 0));

  if (!AudioContext) {
    range.max = "1";
    const updateFallbackVolume = () => {
      const value = Math.min(1, clamp(range.value));
      audio.volume = value;
      range.value = String(value);
      output.textContent = `${Math.round(value * 100)}%`;
    };
    range.addEventListener("input", updateFallbackVolume);
    updateFallbackVolume();
    return {
      getValue: () => Number(range.value),
      setValue: value => {
        range.value = String(Math.min(1, clamp(value)));
        updateFallbackVolume();
      },
      resume: () => Promise.resolve(),
    };
  }

  audio.crossOrigin = "anonymous";
  const context = new AudioContext();
  const source = context.createMediaElementSource(audio);
  const gain = context.createGain();
  source.connect(gain);
  gain.connect(context.destination);
  audio.volume = 1;

  const setValue = value => {
    const clamped = clamp(value);
    range.value = String(clamped);
    gain.gain.setTargetAtTime(clamped, context.currentTime, 0.015);
    output.textContent = `${Math.round(clamped * 100)}%`;
  };

  range.addEventListener("input", () => setValue(range.value));
  audio.addEventListener("play", () => {
    if (context.state === "suspended") context.resume().catch(() => {});
  });
  setValue(range.value);

  return {
    getValue: () => Number(range.value),
    setValue,
    resume: () => context.state === "suspended" ? context.resume() : Promise.resolve(),
  };
};
