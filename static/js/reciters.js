const search = document.getElementById("reciterSearch");
const category = document.getElementById("reciterCategory");
const cards = [...document.querySelectorAll(".reciter-card")];
function filterReciters() {
  const q = search.value.trim().toLowerCase(), c = category.value.toLowerCase();
  let shown = 0;
  cards.forEach(card => {
    const match = card.dataset.name.includes(q) && (!c || card.dataset.category.includes(c));
    card.hidden = !match; if (match) shown++;
  });
  document.getElementById("reciterEmpty").hidden = shown !== 0;
}
search.addEventListener("input", filterReciters);
category.addEventListener("change", filterReciters);
