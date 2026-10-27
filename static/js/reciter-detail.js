(() => {
 const audio = document.getElementById("detailAudio");
 const title = document.getElementById("detailTitle");
 const fill = document.querySelector(".snake-fill");
 const path = document.querySelector(".snake-track");
 const active = document.querySelector(".snake-fill");
 if (path && active) { const length = path.getTotalLength(); active.style.strokeDasharray = length; active.style.strokeDashoffset = length; }
 document.querySelectorAll(".detail-track").forEach(button => button.addEventListener("click", () => {
   audio.src = button.dataset.src; title.textContent = button.dataset.title; audio.play().catch(() => {});
   document.querySelectorAll(".detail-track").forEach(row => row.classList.toggle("is-current", row === button));
 }));
 audio.addEventListener("timeupdate", () => {
   if (!Number.isFinite(audio.duration) || !path || !active) return;
   const length = path.getTotalLength(); active.style.strokeDasharray = length;
   active.style.strokeDashoffset = length * (1 - audio.currentTime / audio.duration);
 });
})();
