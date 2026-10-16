const files = document.querySelector("#files");
const gallery = document.querySelector("#gallery");
const empty = document.querySelector("#empty");
const filters = document.querySelectorAll("[data-filter]");

let items = [];
let selected = "all";

function render() {
  gallery.replaceChildren();

  const visible = items.filter(item =>
    selected === "all" || item.type === selected
  );

  empty.hidden = visible.length > 0;

  visible.forEach(item => {
    const card = document.createElement("article");
    card.className = "item";

    let media;

    if (item.type === "image") {
      media = document.createElement("img");
      media.alt = item.name;
    } else if (item.type === "video") {
      media = document.createElement("video");
      media.controls = true;
    } else {
      media = document.createElement("audio");
      media.controls = true;
    }

    media.src = item.url;
    card.append(media);

    const name = document.createElement("p");
    name.textContent = item.name;
    card.append(name);

    const remove = document.createElement("button");
    remove.textContent = "Xóa";
    remove.onclick = () => {
      URL.revokeObjectURL(item.url);
      items = items.filter(x => x !== item);
      render();
    };

    card.append(remove);
    gallery.append(card);
  });
}

files.addEventListener("change", event => {
  for (const file of event.target.files) {
    const type = file.type.split("/")[0];

    if (!["image", "video", "audio"].includes(type)) {
      continue;
    }

    items.push({
      name: file.name,
      type,
      url: URL.createObjectURL(file)
    });
  }

  files.value = "";
  render();
});

filters.forEach(button => {
  button.onclick = () => {
    selected = button.dataset.filter;

    filters.forEach(b => b.classList.remove("active"));
    button.classList.add("active");

    render();
  };
});

render();
