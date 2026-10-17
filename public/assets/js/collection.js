const files = document.querySelector('#files');
const gallery = document.querySelector('#gallery');
const empty = document.querySelector('#empty');
const filters = document.querySelectorAll('[data-filter]');
let items = [];
let selected = 'all';
let urls = [];
const DB_NAME = 'veltria-collection-v2';
const STORE = 'media';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, {keyPath:'id'});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transact(mode, operation) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
async function load() {
  items = await transact('readonly', s => s.getAll());
  items.sort((a,b) => b.created - a.created);
  render();
}
function render() {
  urls.forEach(u => URL.revokeObjectURL(u));
  urls = [];
  gallery.replaceChildren();
  const visible = items.filter(item => selected === 'all' || item.type === selected);
  empty.hidden = visible.length > 0;
  for (const item of visible) {
    const card = document.createElement('article');
    card.className = 'item';
    const media = document.createElement(item.type === 'image' ? 'img' : item.type === 'video' ? 'video' : 'audio');
    if (item.type === 'image') media.alt = item.name;
    else media.controls = true;
    const url = URL.createObjectURL(item.blob);
    urls.push(url);
    media.src = url;
    card.append(media);
    const name = document.createElement('p');
    name.textContent = item.name;
    card.append(name);
    const remove = document.createElement('button');
    remove.textContent = 'Xóa';
    remove.onclick = async () => {
      if (!confirm('Xóa tác phẩm này khỏi bộ sưu tập?')) return;
      try { await transact('readwrite', s => s.delete(item.id)); await load(); }
      catch (e) { alert('Không xóa được: ' + e.message); }
    };
    card.append(remove);
    gallery.append(card);
  }
}
files.addEventListener('change', async event => {
  const selectedFiles = Array.from(event.target.files);
  files.value = '';
  let saved = 0;
  try {
    for (const file of selectedFiles) {
      const type = file.type.split('/')[0];
      if (!['image','video','audio'].includes(type)) continue;
      const item = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random(),
        name: file.name, type, blob: file, created: Date.now() + saved
      };
      await transact('readwrite', s => s.put(item));
      saved++;
    }
    await load();
  } catch (e) {
    alert('Lưu thất bại (có thể hết dung lượng trình duyệt): ' + e.message);
    await load().catch(() => {});
  }
});
filters.forEach(button => {
  button.onclick = () => {
    selected = button.dataset.filter;
    filters.forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    render();
  };
});
load().catch(e => {
  empty.hidden = false;
  empty.textContent = 'Không mở được bộ nhớ trên thiết bị: ' + e.message;
});
