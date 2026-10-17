'use strict';
const $ = id => document.getElementById(id);
const DB_NAME = 'veltria-collection-v2', STORE = 'media';
let items = [], selected = 'all', urls = [];
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function transact(mode,operation){const db=await openDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),r=operation(tx.objectStore(STORE));r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
const labels={image:'Ảnh',video:'Video',audio:'Audio'};
function extension(name){const m=String(name||'').match(/\.([a-z0-9]{2,5})$/i);return m?m[1].toUpperCase():'';}
function titleFor(item){if(item.title&&item.title.trim())return item.title.trim();const sorted=items.filter(x=>x.type===item.type).sort((a,b)=>(a.created||0)-(b.created||0));const n=sorted.findIndex(x=>x.id===item.id)+1;return `${labels[item.type]||'Tác phẩm'} ${String(Math.max(n,1)).padStart(2,'0')}`;}
function make(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function button(label,fn,cls){const b=make('button',cls,label);b.type='button';b.onclick=fn;return b;}
async function load(){items=await transact('readonly',s=>s.getAll());render();}
function openViewer(item,url){const box=$('viewer-media');box.replaceChildren();const media=make(item.type==='image'?'img':item.type==='video'?'video':'audio');media.src=url;if(item.type!=='image')media.controls=true;else media.alt=titleFor(item);box.append(media);$('viewer-name').textContent=titleFor(item);$('viewer').showModal();}
function download(item,url){
  const ext=extension(item.name).toLowerCase() || (item.type==='image'?'png':item.type==='video'?'mp4':'mp3');
  const clean=titleFor(item).replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').trim().slice(0,80)||'VELTRIA';
  const a=document.createElement('a');a.href=url;a.download=clean+'.'+ext;
  document.body.append(a);a.click();a.remove();
}
async function rename(item){const next=prompt('Đặt tên tác phẩm:',titleFor(item));if(next===null)return;const name=next.trim().slice(0,80);if(!name){alert('Vui lòng nhập tên.');return;}try{await transact('readwrite',s=>s.put({...item,title:name}));await load();}catch(e){alert('Không đổi tên được: '+e.message);}}
async function remove(item){if(!confirm('Xóa tác phẩm này khỏi thư viện?'))return;try{await transact('readwrite',s=>s.delete(item.id));await load();}catch(e){alert('Không xóa được: '+e.message);}}
function generateVideoThumbnail(item,url,element){
  const video=document.createElement('video');video.muted=true;video.preload='auto';video.playsInline=true;
  let finished=false;
  const stop=()=>{video.removeAttribute('src');video.load();};
  video.addEventListener('loadedmetadata',()=>{try{video.currentTime=Math.min(Math.max(video.duration*.1,.1),3);}catch(e){stop();}},{once:true});
  video.addEventListener('seeked',()=>{
    if(finished)return;finished=true;
    try{
      const canvas=document.createElement('canvas');const scale=Math.min(1,480/(video.videoWidth||480));
      canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
      canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
      canvas.toBlob(async blob=>{
        if(!blob)return;
        if(element.isConnected){const poster=URL.createObjectURL(blob);urls.push(poster);element.poster=poster;}
        try{await transact('readwrite',store=>store.put({...item,thumbnail:blob}));}catch(e){console.warn('Thumbnail not saved',e);}
      },'image/jpeg',.78);
    }catch(e){console.warn('Thumbnail error',e);}finally{stop();}
  },{once:true});
  video.addEventListener('error',stop,{once:true});video.src=url;
}
function render(){urls.forEach(u=>URL.revokeObjectURL(u));urls=[];$('gallery').replaceChildren();const q=$('search').value.trim().toLocaleLowerCase();const visible=items.filter(x=>(selected==='all'||x.type===selected)&&(!q||titleFor(x).toLocaleLowerCase().includes(q)||String(x.name||'').toLocaleLowerCase().includes(q)));const sort=$('sort').value;visible.sort((a,b)=>sort==='old'?(a.created||0)-(b.created||0):sort==='name'?titleFor(a).localeCompare(titleFor(b),'vi'):(b.created||0)-(a.created||0));$('count').textContent=`${visible.length} tác phẩm`;$('empty').hidden=visible.length>0;$('empty').textContent=items.length?'Không tìm thấy tác phẩm phù hợp.':'Chưa có tác phẩm nào. Nhấn + Thêm để bắt đầu.';for(const item of visible){if(!item.blob)continue;const url=URL.createObjectURL(item.blob);urls.push(url);const card=make('article','item');let media;if(item.type==='audio'){media=make('div','audio-wrap');const audio=make('audio');audio.controls=true;audio.src=url;media.append(audio);}else{media=make(item.type==='image'?'img':'video','thumb');media.src=url;if(item.type==='image'){media.alt=titleFor(item);media.loading='lazy';}else{
  media.preload='metadata';media.muted=true;media.playsInline=true;
  if(item.thumbnail){const poster=URL.createObjectURL(item.thumbnail);urls.push(poster);media.poster=poster;}
  else generateVideoThumbnail(item,url,media);
}media.onclick=()=>openViewer(item,url);}card.append(media);const info=make('div','item-info'),name=make('p','item-title',titleFor(item));name.title=item.name||'';const meta=make('p','item-meta',`${labels[item.type]||'Tệp'}${extension(item.name)?' · '+extension(item.name):''}`),actions=make('div','actions');const menu=make('details','item-menu');
const toggle=make('summary','menu-toggle','⋯');toggle.setAttribute('aria-label','Thao tác với '+titleFor(item));
const menuBody=make('div','menu-body');
menuBody.append(button('✎ Đổi tên',()=>{menu.open=false;rename(item);}),button('↓ Tải xuống',()=>{menu.open=false;download(item,url);}),button('Xóa',()=>{menu.open=false;remove(item);},'delete'));
menu.append(toggle,menuBody);actions.append(menu);info.append(name,meta,actions);card.append(info);$('gallery').append(card);}}
$('files').addEventListener('change',async e=>{const incoming=Array.from(e.target.files);e.target.value='';let saved=0;try{for(const file of incoming){const type=file.type.split('/')[0];if(!['image','video','audio'].includes(type))continue;const item={id:crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`,name:file.name,type,blob:file,created:Date.now()+saved};await transact('readwrite',s=>s.put(item));saved++;}await load();}catch(err){alert('Không thể lưu, có thể bộ nhớ trình duyệt đã đầy: '+err.message);await load().catch(()=>{});}});
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{selected=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));render();});$('search').addEventListener('input',render);$('sort').addEventListener('change',render);$('viewer-close').onclick=()=>$('viewer').close();$('viewer').addEventListener('close',()=>{$('viewer-media').replaceChildren();});load().catch(e=>{$('empty').hidden=false;$('empty').textContent='Không đọc được thư viện: '+e.message;});
