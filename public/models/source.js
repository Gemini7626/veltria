const source = document.body.dataset.source;
const isRed = source === "red";
const api = `/api/${source}/models`;

const title = document.getElementById("title");
const grid = document.getElementById("grid");
const status = document.getElementById("status");
const search = document.getElementById("search");
const form = document.getElementById("searchForm");

title.textContent = isRed ? "VELTRIA RED" : "VELTRIA COM";

let page = 1;

async function loadModels() {
  status.textContent = "Đang tải model...";
  grid.replaceChildren();

  const params = new URLSearchParams({
    page: String(page)
  });

  if (search.value.trim()) {
    params.set("query", search.value.trim());
  }

  try {
    const response = await fetch(`${api}?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    const items = data.items || [];

    status.textContent = `Đã tải ${items.length} model từ ${source.toUpperCase()}`;

    for (const model of items) {
      const card = document.createElement("article");
      card.className = "card";

      const image = model.modelVersions
        ?.flatMap(v => v.images || [])
        .find(i => typeof i.url === "string" && i.url.startsWith("https://"));

      if (image) {
        const img = document.createElement("img");
        img.src = image.url;
        img.loading = "lazy";
        img.alt = model.name || "Model";
        card.appendChild(img);
      }

      const info = document.createElement("div");
      info.className = "info";

      const name = document.createElement("h3");
      name.textContent = model.name || "Untitled";

      const type = document.createElement("p");
      type.textContent = model.type || "Model";

      const link = document.createElement("a");
      link.href = `https://civitai.${isRed ? "red" : "com"}/models/${model.id}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Xem model ↗";

      info.append(name, type, link);
      card.appendChild(info);
      grid.appendChild(card);
    }
  } catch (error) {
    status.textContent = `Không tải được dữ liệu: ${error.message}`;
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  page = 1;
  loadModels();
});

loadModels();
