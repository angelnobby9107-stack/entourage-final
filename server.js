// Entourage room server: zero dependencies. Run: node server.js   (Node 18+)
const http=require("http"),fs=require("fs"),path=require("path"),os=require("os"),https=require("https"),crypto=require("crypto");
const PORT=process.env.PORT||3000,rooms=new Map();
const json=(res,c,o)=>{res.writeHead(c,{"Content-Type":"application/json"});res.end(JSON.stringify(o))};
const body=(req,cb)=>{let b="";req.on("data",c=>{b+=c;if(b.length>60000)req.destroy()});req.on("end",()=>{try{cb(JSON.parse(b||"{}"))}catch(e){cb(null)}})};
const code=()=>{const A="ABCDEFGHJKMNPQRSTUVWXYZ";for(;;){let c="";for(let i=0;i<4;i++)c+=A[crypto.randomInt(A.length)];if(!rooms.has(c))return c}};
const send=(res,ev,d)=>res.write("event: "+ev+"\ndata: "+JSON.stringify(d)+"\n\n");
const peersList=r=>[...r.peers].map(([uid,presence])=>({uid,presence}));
http.createServer((req,res)=>{
  const u=new URL(req.url,"http://x"),q=u.searchParams,P=u.pathname;
  if(req.method==="GET"&&P==="/"){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});return res.end(fs.readFileSync(path.join(__dirname,"public","index.html")))}
  if(P==="/api/create"&&req.method==="POST"){const c=code(),key=crypto.randomBytes(8).toString("hex");rooms.set(c,{key,live:null,peers:new Map(),host:new Set(),players:new Set(),t:Date.now()});return json(res,200,{room:c,key})}
  const room=rooms.get((q.get("room")||q.get("code")||"").toUpperCase());
  if(P==="/api/room")return json(res,200,{ok:!!room&&(!q.get("key")||q.get("key")===room.key)});
  if(!room)return json(res,404,{error:"no room"});
  room.t=Date.now();const isHost=q.get("key")===room.key;
  if(P==="/api/events"){
    res.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-cache",Connection:"keep-alive","X-Accel-Buffering":"no"});
    const host=q.get("role")==="host"&&isHost,set=host?room.host:room.players;set.add(res);
    host?send(res,"peers",peersList(room)):send(res,"live",room.live);
    return req.on("close",()=>set.delete(res));
  }
  if(P==="/api/live"&&req.method==="POST"){
    if(!isHost)return json(res,403,{});
    return body(req,o=>{if(!o)return json(res,400,{});room.live=o;room.players.forEach(r=>send(r,"live",o));json(res,200,{ok:1})});
  }
  if(P==="/api/presence"&&req.method==="POST"){
    const uid=(q.get("uid")||"").slice(0,24);if(!uid)return json(res,400,{});
    return body(req,o=>{if(!o||typeof o!=="object")return json(res,400,{});
      room.peers.set(uid,{tm:+o.tm,k:String(o.k||"").slice(0,20),pk:+o.pk,rk:+o.rk?1:0,hu:+o.hu?1:0,tx:String(o.tx||"").slice(0,600),t:+o.t||Date.now()});
      room.host.forEach(r=>send(r,"peers",peersList(room)));json(res,200,{ok:1})});
  }
  if(P==="/api/sample"&&req.method==="POST"){
    const k=process.env.ANTHROPIC_API_KEY;if(!isHost)return json(res,403,{});if(!k)return json(res,501,{error:"no key"});
    return body(req,o=>{if(!o||!o.prompt)return json(res,400,{});
      const data=JSON.stringify({model:process.env.ANTHROPIC_MODEL||"claude-haiku-5-5",max_tokens:1500,messages:[{role:"user",content:String(o.prompt).slice(0,8000)}]});
      const rq=https.request({host:"api.anthropic.com",path:"/v1/messages",method:"POST",headers:{"content-type":"application/json","x-api-key":k,"anthropic-version":"2023-06-01"}},rs=>{let b="";rs.on("data",c=>b+=c);rs.on("end",()=>{try{json(res,200,{value:JSON.parse(JSON.parse(b).content[0].text.match(/\[[\s\S]*\]/)[0])})}catch(e){json(res,502,{error:"bad reply"})}})});
      rq.on("error",()=>json(res,502,{error:"upstream"}));rq.end(data)});
  }
  json(res,404,{});
}).listen(PORT,"0.0.0.0",()=>{
  console.log("Entourage running. Host on this machine: http://localhost:"+PORT);
  Object.values(os.networkInterfaces()).flat().filter(i=>i&&i.family==="IPv4"&&!i.internal).forEach(i=>console.log("Players on the same Wi-Fi: http://"+i.address+":"+PORT));
});
setInterval(()=>{const now=Date.now();rooms.forEach((r,c)=>{[...r.host,...r.players].forEach(s=>s.write(": ka\n\n"));if(now-r.t>12*3600e3)rooms.delete(c)})},20000);
