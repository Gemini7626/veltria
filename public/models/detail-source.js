const source = document.body.dataset.source;
const id = new URLSearchParams(location.search).get("id");
const $ = x => document.getElementById(x);

$("back").href = `/models/${source}/`;

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

async function load() {
  if (!/^[1-9]\d*$/.test(id || "")) {
    $("name").textContent = "Model ID không hợp lệ";
    return;
  }

  try {
    const response = await fetch(`/api/${source}/model/${id}`);
    const model = await response.json();

    if (!response.ok || model.error)
      throw new Error(model.error || `HTTP ${response.status}`);

    $("name").textContent = model.name || "Model";
    $("meta").textContent =
      `${model.type || "Model"} • ${model.creator || "Unknown"} • ${source.toUpperCase()}`;

    const seen = new Set();

    for (const version of model.versions || []) {
      for (const media of version.images || []) {
        const url = safeUrl(media.url);
        if (!url || seen.has(url)) continue;
        seen.add(url);

        const element = document.createElement(
          media.type === "video" ? "video" : "img"
        );

        element.src = url;

        if (element.tagName === "VIDEO") {
          element.controls = true;
          element.preload = "metadata";
        } else {
          element.loading = "lazy";
          element.alt = model.name || "Model";
        }

        $("gallery").appendChild(element);
      }

      const panel = document.createElement("section");
      panel.className = "panel";

      const heading = document.createElement("h3");
      heading.textContent = version.name || "Version";

      const base = document.createElement("p");
      base.textContent = version.baseModel || "";

      panel.append(heading, base);

      for (const file of version.files || []) {
        const url = safeUrl(file.downloadUrl);
        if (!url) continue;

        const link = document.createElement("a");
        link.href = url;
        link.textContent = `Tải ${file.name || "model"} ↗`;
        link.rel = "noopener noreferrer";
        link.target = "_blank";

        panel.append(link, document.createElement("br"));
      }

      $("versions").appendChild(panel);
    }

    if (!seen.size)
      $("gallery").textContent = "Chưa có media từ API chi tiết model.";

    const description = new DOMParser().parseFromString(
      model.description || "", "text/html"
    ).body.textContent || "";

    $("description").textContent = description;
    $("status").textContent = "Đã tải dữ liệu từ " + source.toUpperCase();

  } catch (error) {
    $("status").textContent = "Lỗi: " + error.message;
  }
}

load();
