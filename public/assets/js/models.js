const input = document.querySelector("#modelSearch");
const buttons = document.querySelectorAll("[data-filter]");
const cards = document.querySelectorAll(".model-card");

let currentFilter = "All";

function updateModels() {
  const query = input.value.toLowerCase().trim();

  cards.forEach(card => {
    const matchesText = card.textContent.toLowerCase().includes(query);
    const matchesType =
      currentFilter === "All" ||
      card.dataset.type === currentFilter;

    card.hidden = !(matchesText && matchesType);
  });
}

input.addEventListener("input", updateModels);

buttons.forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;

    buttons.forEach(b => b.classList.remove("active"));
    button.classList.add("active");

    updateModels();
  });
});
