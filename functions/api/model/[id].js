const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
export async function onRequestGet({params,env}){
 const id=Number(params.id);
 if(!Number.isSafeInteger(id)||id<1)return json({error:"ID không hợp lệ"},400);
 try{
  const headers={Accept:"application/json"};
  if(env.CIVITAI_API_KEY)headers.Authorization=`Bearer ${env.CIVITAI_API_KEY}`;
  const res=await fetch(`https://civitai.red/api/v1/models/${id}`,{headers,signal:AbortSignal.timeout(12000)});
  if(!res.ok)return json({error:"Không tải được model",upstreamStatus:res.status},res.status===404?404:502);
  const m=await res.json();
  const versions=(m.modelVersions||[]).map(v=>({id:v.id,name:v.name,baseModel:v.baseModel,
files:(v.files||[]).map(f=>({id:f.id??null,hashes:f.hashes||{},
  name:f.name||"",
  sizeKB:f.sizeKB??null,
  type:f.type||"",
  format:f.metadata?.format||"",
  downloadUrl:typeof f.downloadUrl==="string"
    && f.downloadUrl.startsWith("https://")
    ? f.downloadUrl:null
})),
images:(v.images||[]).filter(i=>typeof i.url==="string"&&i.url.startsWith("https://")).slice(0,24).map(i=>i.url),media:(v.images||[]).filter(i=>typeof i.url==="string"&&i.url.startsWith("https://")).slice(0,24).map(i=>({id:i.id||null,url:i.url,type:i.type||null,mimeType:i.mimeType||null,nsfwLevel:i.nsfwLevel??null,meta:i.meta||null}))}));
  const sourceImages = (m.modelVersions||[])
    .flatMap(v=>v.images||[]);

  const previewImages = [...new Set(
    versions.flatMap(v=>v.images)
  )].slice(0,48);

  let totalImages = sourceImages.length;
  let imageSource = "modelVersions";

  if (!previewImages.length) {
    try {
      const imageParams = new URLSearchParams({
        modelId: String(id),
        limit: "20"
      });

      const imageResponse = await fetch(
        "https://civitai.red/api/v1/images?" + imageParams,
        {
          headers,
          signal: AbortSignal.timeout(8000)
        }
      );

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();

        const fallbackImages = (imageData.items || [])
          .filter(i =>
            typeof i.url === "string" &&
            i.url.startsWith("https://")
          );

        for (const item of fallbackImages) {
          if (!previewImages.includes(item.url)) {
            previewImages.push(item.url);
          }
        }

        if (fallbackImages.length) {
          totalImages = fallbackImages.length;
          imageSource = "imagesAPI";
        }
      }
    } catch {
      // Giữ nguyên dữ liệu model nếu API ảnh lỗi.
    }
  }

  return json({
    technical: {
      modelType: m.type || null,
      nsfw: m.nsfw ?? null,
      downloadCount: m.stats?.downloadCount ?? null,
      thumbsUpCount: m.stats?.thumbsUpCount ?? null,
      rating: m.stats?.rating ?? null,
      ratingCount: m.stats?.ratingCount ?? null,
      versionCount: versions.length,
      publishedAt: m.publishedAt || null
    },
    imageSource,totalImages,
    image:previewImages[0]||null,
    previewImages,
    id:m.id,name:m.name,type:m.type,creator:m.creator?.username||"",description:m.description||"",tags:m.tags||[],versions,
    previewStatus: previewImages.length
      ? "available"
      : sourceImages.length
        ? "unavailable" : "missing",
    url:`https://civitai.red/models/${id}`});
 }catch{return json({error:"Không kết nối được Civitai"},502)}
}
