// Project-owned graphics with explicit evidence links. Legacy Rus profile is opt-in by pack id.
import {MAP_CITIES,MOSCOW_TREE,TIMELINE_TICKS,WATER} from '../src/doc/graphic-data.ts';
export const isRus=p=>p.id==='rurikids';
export function validateGraphics(p){
 const g=p.graphics;if(g===undefined)return;const fail=m=>{throw new Error('Материалы: графика — '+m);};
 if(!g||typeof g!=='object'||Array.isArray(g))fail('ожидается объект');const claims=new Set(p.claims.map(c=>c.id));
 const evidence=v=>{if(!Array.isArray(v.claimIds)||!v.claimIds.length||v.claimIds.some(id=>!claims.has(id)))fail('нужны существующие claimIds');};
 for(const key of ['places','routes','genealogy'])if(g[key]!==undefined&&(!Array.isArray(g[key])||g[key].length>50))fail(key+': максимум50 записей');
 const places=new Set();for(const v of g.places||[]){if(typeof v.id!=='string'||!v.id||places.has(v.id)||typeof v.label!=='string'||!v.label.trim()||v.label.length>80||![v.x,v.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1))fail('неверная точка/координаты0…1');evidence(v);places.add(v.id);}
 for(const v of g.routes||[]){if(!places.has(v.from)||!places.has(v.to)||v.from===v.to)fail('неизвестный конец маршрута');evidence(v);}
 const nodes=new Map();for(const v of g.genealogy||[]){if(typeof v.id!=='string'||!v.id||nodes.has(v.id)||typeof v.name!=='string'||!v.name.trim()||v.name.length>80||(v.dates!==undefined&&typeof v.dates!=='string'))fail('неверный узел родства');evidence(v);nodes.set(v.id,v);}
 for(const v of nodes.values()){const seen=new Set([v.id]);let n=v;while(n.parent){if(!nodes.has(n.parent)||seen.has(n.parent))fail('неизвестный родитель или цикл');seen.add(n.parent);n=nodes.get(n.parent);}}
}
export function projectGraphics(p){
 validateGraphics(p);if(isRus(p))return {profile:'rurikids',places:MAP_CITIES.map((c,i)=>({id:String(i),label:c.name,x:c.x/1000,y:c.y/640})),routes:[{from:'0',to:'1'},{from:'1',to:'2'}],water:WATER,ticks:TIMELINE_TICKS,tree:MOSCOW_TREE.map(n=>({...n,years:p.claims.filter(c=>c.person===n.name).map(c=>c.date.value).filter((v,i,a)=>a.indexOf(v)===i).join(', ')||'дата не указана'}))};
 const g=p.graphics||{},tree=(g.genealogy||[]).map(n=>({...n,years:n.dates||'дата не указана'}));
 const ticks=[...new Set(p.claims.flatMap(c=>c.date.precision==='year'&&/^\d{1,4}$/.test(c.date.value)?[Number(c.date.value)]:c.era?[c.era[0],c.era[1]]:[]))].sort((a,b)=>a-b);
 return {profile:'generic',places:g.places||[],routes:g.routes||[],ticks,tree};
}
