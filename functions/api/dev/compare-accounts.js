const json=(data,status=200)=>new Response(
 JSON.stringify(data,null,2),
 {
  status,
  headers:{
   "Content-Type":"application/json; charset=utf-8",
   "Cache-Control":"no-store"
  }
 }
);

export async function onRequestGet({request,env}){
 const url=new URL(request.url);
 const token=request.headers.get("X-Dev-Token");

 if(!env.VELTRIA_DEV_TOKEN ||
    token!==env.VELTRIA_DEV_TOKEN){
  return json({error:"Unauthorized"},401);
 }

 const modelId=Number(url.searchParams.get("modelId")||499369);

 if(!Number.isSafeInteger(modelId)||modelId<1){
  return json({error:"Invalid modelId"},400);
 }

 async function check(host,key){
  if(!key){
   return {configured:false};
  }

  try{
   const res=await fetch(
    `https://${host}/api/v1/images?modelId=${modelId}&limit=100`,
    {
     headers:{
      Authorization:`Bearer ${key}`,
      Accept:"application/json"
     },
     signal:AbortSignal.timeout(15000)
    }
   );

   if(!res.ok){
    return {
     configured:true,
     status:res.status,
     count:0
    };
   }

   const data=await res.json();
   const items=Array.isArray(data.items)?data.items:[];

   return {
    configured:true,
    status:res.status,
    count:items.length,
    imageIds:items.map(x=>x.id).filter(Boolean)
   };
  }catch(e){
   return {
    configured:true,
    error:"Request failed"
   };
  }
 }

 const [red,com]=await Promise.all([
  check("civitai.red",env.CIVITAI_API_KEY),
  check("civitai.com",env.CIVITAI_COM_API_KEY)
 ]);

 const redIds=new Set(red.imageIds||[]);
 const comIds=new Set(com.imageIds||[]);

 return json({
  modelId,
  red,
  com,
  sharedImages:[...redIds].filter(id=>comIds.has(id)).length,
  redOnly:[...redIds].filter(id=>!comIds.has(id)).length,
  comOnly:[...comIds].filter(id=>!redIds.has(id)).length
 });
}
