const send=(data,status=200)=>new Response(JSON.stringify(data),{
 status,
 headers:{
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"public, max-age=120",
  "X-Content-Type-Options":"nosniff"
 }
});

export async function onRequestGet({request,env}){
 const u=new URL(request.url);
 const id=Number(u.searchParams.get("modelId"));
 const limit=Math.min(100,Math.max(1,Number(u.searchParams.get("limit"))||50));

 if(!Number.isSafeInteger(id)||id<1)
  return send({error:"Model ID không hợp lệ"},400);

 const headers={Accept:"application/json"};
 if(env.CIVITAI_API_KEY)
  headers.Authorization=`Bearer ${env.CIVITAI_API_KEY}`;

 const hosts=[
  ["red","civitai.red"],
  ["com","civitai.com"]
 ];

 const results=await Promise.all(hosts.map(async([source,host])=>{
  try{
   const q=new URLSearchParams({
    modelId:String(id),
    limit:String(limit)
   });

   const res=await fetch(
    `https://${host}/api/v1/images?${q}`,
    {headers,signal:AbortSignal.timeout(10000)}
   );

   if(!res.ok)
    return {source,ok:false,status:res.status,items:[]};

   const data=await res.json();

   const items=(data.items||[])
    .filter(x=>typeof x.url==="string" && x.url.startsWith("https://"))
    .map(x=>({
     id:x.id??null,
     url:x.url,
     type:x.type||"image",
     mimeType:x.mimeType||null,
     username:x.username||null,
     sources:[source]
    }));

   return {source,ok:true,items};
  }catch{
   return {source,ok:false,items:[]};
  }
 }));

 const map=new Map();

 for(const result of results){
  for(const item of result.items){
   const key=item.id!=null
    ?`id:${item.id}`
    :`url:${item.url}`;

   if(map.has(key)){
    const existing=map.get(key);
    existing.sources=[...new Set([
     ...existing.sources,
     ...item.sources
    ])];
   }else{
    map.set(key,item);
   }
  }
 }

 const items=[...map.values()];

 return send({
  modelId:id,
  total:items.length,
  sources:results.map(r=>({
   source:r.source,
   ok:r.ok,
   count:r.items.length
  })),
  items
 });
}
