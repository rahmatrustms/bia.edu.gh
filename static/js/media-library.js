const searchInput = document.getElementById("mediaSearch");
const resultCount = document.getElementById("mediaResultCount");
const emptyMessage = document.getElementById("mediaEmpty");
const cards = [...document.querySelectorAll(".media-reciter-card")];
const categoryButtons = [...document.querySelectorAll(".media-filter")];
let selectedCategory = "";

function filterReciters() {
  const query = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;

  cards.forEach(card => {
    const matchesQuery = card.dataset.search.includes(query);
    const categories = card.dataset.category.split(",").map(value => value.trim());
    const matchesCategory = !selectedCategory || categories.includes(selectedCategory);
    const visible = matchesQuery && matchesCategory;
    card.hidden = !visible;
    if (visible) visibleCount++;
  });

  resultCount.textContent = `${visibleCount} reciter${visibleCount === 1 ? "" : "s"}`;
  emptyMessage.hidden = visibleCount > 0;
}

searchInput.addEventListener("input", filterReciters);
categoryButtons.forEach(button => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category.toLowerCase();
    categoryButtons.forEach(item => item.classList.toggle("active", item === button));
    filterReciters();
  });
});
