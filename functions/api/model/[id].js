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
  if(m.nsfw)return json({error:"Model không khả dụng ở khu vực công khai"},403);
  const versions=(m.modelVersions||[]).map(v=>({id:v.id,name:v.name,baseModel:v.baseModel,images:(v.images||[]).filter(i=>i.nsfwLevel===1||i.nsfw==="None").slice(0,8).map(i=>i.url)}));
  return json({id:m.id,name:m.name,type:m.type,creator:m.creator?.username||"",description:m.description||"",tags:m.tags||[],versions,url:`https://civitai.com/models/${id}`});
 }catch{return json({error:"Không kết nối được Civitai"},502)}
}
