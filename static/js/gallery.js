(() => {
 const search = document.getElementById("gallerySearch"), cards = [...document.querySelectorAll(".gallery-card")];
 const chips = [...document.querySelectorAll(".filter-chip")], empty = document.getElementById("galleryEmpty");
 let filter = "all", current = 0, visibleCards = cards;
 function apply() {
  const q = search.value.trim().toLowerCase(); let shown = 0;
  cards.forEach(card => { const ok = (filter === "all" || card.dataset.category === filter) && (card.dataset.title.toLowerCase().includes(q) || card.dataset.category.includes(q)); card.hidden = !ok; if(ok) shown++; });
    visibleCards = cards.filter(card => !card.hidden);
  empty.hidden = shown > 0;
 }
 chips.forEach(chip => chip.addEventListener("click", () => { filter = chip.dataset.filter; chips.forEach(c => c.classList.toggle("active", c === chip)); apply(); }));
 search.addEventListener("input", apply);
 const box = document.getElementById("galleryLightbox"), image = document.getElementById("lightboxImage"), title = document.getElementById("lightboxTitle"), cat = document.getElementById("lightboxCategory");
 function show(i) { if (!visibleCards.length) return; current = (i + visibleCards.length) % visibleCards.length; const c = visibleCards[current]; image.src = c.querySelector("img").src; image.alt = c.querySelector("img").alt; title.textContent = c.dataset.title; cat.textContent = c.dataset.category; box.hidden = false; document.body.classList.add("lightbox-open"); }
 function close() { box.hidden = true; document.body.classList.remove("lightbox-open"); }
 cards.forEach(c => c.addEventListener("click", () => show(visibleCards.indexOf(c))));
 document.getElementById("lightboxClose").addEventListener("click", close);
 document.getElementById("lightboxPrev").addEventListener("click", () => show(current-1));
 document.getElementById("lightboxNext").addEventListener("click", () => show(current+1));
 box.addEventListener("click", e => { if(e.target === box) close(); });
 document.addEventListener("keydown", e => { if(e.key === "Escape") close(); if(!box.hidden && e.key === "ArrowRight") show(current+1); if(!box.hidden && e.key === "ArrowLeft") show(current-1); });
})();
