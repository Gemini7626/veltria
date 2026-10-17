const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
export async function onRequestGet({params,env}){
 const id=Number(params.id);
 if(!Number.isSafeInteger(id)||id<1)return json({error:"ID không hợp lệ"},400);
 try{
  const headers={Accept:"application/json"};
  if(env.CIVITAI_API_KEY)headers.Authorization=`Bearer ${env.CIVITAI_API_KEY}`;
  const res=await fetch(`https://civitai.com/api/v1/models/${id}`,{headers,signal:AbortSignal.timeout(12000)});
  if(!res.ok)return json({error:"Không tải được model",upstreamStatus:res.status},res.status===404?404:502);
  const m=await res.json();
  const versions=(m.modelVersions||[]).map(v=>({id:v.id,name:v.name,baseModel:v.baseModel,images:(v.images||[]).filter(i=>typeof i.url==="string"&&i.url.startsWith("https://")).slice(0,24).map(i=>i.url),media:(v.images||[]).filter(i=>typeof i.url==="string"&&i.url.startsWith("https://")).slice(0,24).map(i=>({id:i.id||null,url:i.url,type:i.type||null,mimeType:i.mimeType||null,nsfwLevel:i.nsfwLevel??null,meta:i.meta||null}))}));
  const sourceImages = (m.modelVersions||[])
    .flatMap(v=>v.images||[]);

  const previewImages = [...new Set(
    versions.flatMap(v=>v.images)
  )].slice(0,48);

  const totalImages = sourceImages.length;

  return json({totalImages,
    image:previewImages[0]||null,
    previewImages,
    id:m.id,name:m.name,type:m.type,creator:m.creator?.username||"",description:m.description||"",tags:m.tags||[],versions,
    previewStatus: versions.some(v=>v.images.length)
      ? "available"
      : (m.modelVersions||[]).some(v=>(v.images||[]).length)
        ? "unavailable" : "missing",
    url:`https://civitai.com/models/${id}`});
 }catch{return json({error:"Không kết nối được Civitai"},502)}
}
