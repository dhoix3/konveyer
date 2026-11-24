import crypto from 'node:crypto';
import os from 'node:os';
export class HttpError extends Error {
  constructor(status,message){super(message);this.status=status;}
}
export function readBody(req, limit=1024*1024) {
  return new Promise((resolve,reject)=>{
    const chunks=[]; let bytes=0, done=false;
    const fail=(status,message)=>{if(!done){done=true;reject(new HttpError(status,message));}};
    if(Number(req.headers['content-length'])>limit){fail(413,'request body exceeds byte limit');req.resume();return;}
    req.on('data',chunk=>{
      bytes+=chunk.length;
      if(bytes>limit){fail(413,'request body exceeds byte limit');return;}
      if(!done)chunks.push(chunk);
    });
    req.on('end',()=>{
      if(done)return;
      try {
        const body=bytes?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};
        if(!body || typeof body!=='object' || Array.isArray(body))throw new Error();
        done=true;resolve(body);
      }catch{fail(400,'bad json: expected object');}
    });
    req.on('error',e=>fail(400,e.message));req.on('aborted',()=>fail(400,'request aborted'));
  });
}
const equal=(a,b)=>typeof a==='string' && Buffer.byteLength(a)===Buffer.byteLength(b) && crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function createSecurity({host='127.0.0.1',token,allowedHosts=[]}={}) {
  const loopback=['127.0.0.1','localhost','::1'].includes(host);
  if(!loopback && (!token || Buffer.byteLength(token)<32))throw new Error('Network GUI requires KOVEYER_GUI_TOKEN (at least 32 bytes).');
  if(token && (!/^[A-Za-z0-9_-]{32,256}$/.test(token)))throw new Error('GUI token must be 32–256 URL-safe characters');
  const explicitHosts=new Set(allowedHosts.map(h=>h.toLowerCase()));
  const hosts=new Set(['127.0.0.1','localhost','[::1]',host]);
  if(!loopback)for(const entries of Object.values(os.networkInterfaces()))for(const x of entries||[])hosts.add(x.family==='IPv6'?`[${x.address}]`:x.address);
  for(const h of allowedHosts){if(!/^[a-zA-Z0-9.-]+$/.test(h))throw new Error('invalid allowed host');hosts.add(h.toLowerCase());}
  return {
    tokenRequired:!!token,
    checkBoundary(req,port){
      let parsed;
      try{parsed=new URL(`http://${req.headers.host}`);}catch{throw new HttpError(403,'invalid Host');}
      if(!hosts.has(parsed.hostname.toLowerCase()) || (!explicitHosts.has(parsed.hostname.toLowerCase()) && Number(parsed.port||80)!==port) || parsed.username || parsed.password || parsed.pathname!=='/')throw new HttpError(403,'Host not allowed');
      if(req.headers['sec-fetch-site']==='cross-site')throw new HttpError(403,'cross-site request forbidden');
      if(req.headers.origin){
        let origin;try{origin=new URL(req.headers.origin);}catch{throw new HttpError(403,'invalid Origin');}
        if(!['http:','https:'].includes(origin.protocol) || origin.host.toLowerCase()!==parsed.host.toLowerCase())throw new HttpError(403,'Origin not allowed');
      }
      if(req.method==='POST' && req.headers['content-type']?.split(';')[0]!=='application/json')throw new HttpError(415,'application/json required');
    },
    authorized(req){
      if(!token)return true;
      const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('koveyer_session='))?.slice(16);
      return [req.headers.authorization?.replace(/^Bearer /,''),req.headers['x-koveyer-token'],cookie].some(v=>equal(v,token));
    },
    login(value){return !!token && equal(value,token);},
    cookie(){return `koveyer_session=${token}; HttpOnly; SameSite=Strict; Path=/`;},
  };
}
export const LOGIN_PAGE=`<!doctype html><html lang="ru"><meta charset="utf-8"><title>Koveyer — вход</title><body style="background:#0d1117;color:#dff;font:18px system-ui;padding:40px"><h1>Koveyer Dhoix'a</h1><p>Сетевой доступ требует токен сервера. Токен не передаётся в URL.</p><form id="login"><input id="token" type="password" autocomplete="off" required><button>Войти</button></form><p id="error"></p><script>document.getElementById('login').onsubmit=async e=>{e.preventDefault();const r=await fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:document.getElementById('token').value})});if(r.ok)location.reload();else document.getElementById('error').textContent='Доступ запрещён';};</script></body></html>`;
