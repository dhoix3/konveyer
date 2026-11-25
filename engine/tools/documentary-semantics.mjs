// Explicit version in every refreshed plan: old saved project.doc is never selection authority.
export const SELECTION_VERSION='documentary-selection-4';
export function heroTree(graphic,hero){
 const nodes=graphic.tree||[],root=nodes.find(n=>n.name===hero);if(!root)return [];
 const related=new Set([root.id]),queue=[root];
 while(queue.length&&related.size<4){const n=queue.shift();for(const other of nodes.filter(p=>p.id===n.parent||p.parent===n.id)){if(!related.has(other.id)){related.add(other.id);queue.push(other);if(related.size===4)break;}}}
 return related.size>1?nodes.filter(n=>related.has(n.id)).map(n=>({...n,parent:related.has(n.parent)?n.parent:null})):[];
}
export function selectDocumentaryGraphic(claims,graphic,{previousKey}={}){
 const hero=claims[0]?.person,ids=new Set(claims.map(c=>c.id)),text=claims.map(c=>c.text+' '+(c.narration||'')).join(' ');
 const related=v=>!v.claimIds||v.claimIds.some(id=>ids.has(id));
 const places=(graphic.places||[]).filter(related).filter(p=>graphic.profile!=='rurikids'||claims.some(c=>(c.place||'').includes(p.label)));
 const tree=heroTree(graphic,hero);
 const relation=/\b(genealog\w*|parent|father|mother|son|daughter|family)\b|сын|доч[ьи]|отц|отец|родослов|родств|семь[яи]/iu.test(text);
 const movement=/\b(route|journey|travel|migration|conquest|location)\b|поход|маршрут|захват|нашеств|перемещ|пут[ьи]|прибыл|расположен/iu.test(text);
 let mode,reason;
 if(relation&&tree.length>=2){mode='tree';reason='Родственные отношения героя '+hero+' заданы в knowledge';}
 else if(movement&&places.length){mode='map';reason='Географическое/маршрутное событие и относящиеся к нему места';}
 else if(claims.some(c=>c.date.precision!=='unknown'&&c.date.value.trim())){mode='timeline';reason='Хронологическое событие сцены: '+claims.map(c=>c.date.value).join('; ');}
 else {mode='evidence';reason='Нет географического/хронологического основания или связей героя; карточка без панели данных';}
 const result={mode,reason,tree:mode==='tree'?tree:[],places:mode==='map'?places:[]};
 if(previousKey&&graphicContentKey({mode,...selectionData(claims,graphic,result)})===previousKey){result.mode='evidence';result.reason='Содержимое предыдущей панели совпадает: вместо повтора — карточка героя/цитата';result.tree=[];result.places=[];}
 return result;
}
export function readableSources(pack,ids){return [...new Set(ids)].map(id=>{const source=pack.sources.find(s=>s.id===id);return {id,title:source?.shortTitle||source?.title||'Источник не указан'};});}
function selectionData(claims,graphic,selected){return {person:claims[0]?.person,mapData:{places:selected.places,routes:(graphic.routes||[]).filter(r=>selected.places.some(p=>p.id===r.from)&&selected.places.some(p=>p.id===r.to))},tree:selected.mode==='tree'?selected.tree:undefined,events:claims.map(c=>({year:c.date.precision==='year'&&/^\d{1,4}$/.test(c.date.value)?Number(c.date.value):c.era?.[0],label:c.eventLabel||c.text,date:c.date.value})),name:claims[0]?.person||'Эпизод исследования'};}
export function graphicContentKey(doc){return JSON.stringify([doc.mode,doc.mode==='map'?doc.mapData:doc.mode==='tree'?(doc.tree||[]).map(n=>[n.id,n.parent,n.years]):doc.mode==='timeline'?doc.events:[doc.name,doc.events?.map(e=>e.label)]]);}
export function refreshSceneSelection(scene,pack,previousKey){
 const claims=(scene.lines||[]).flatMap(l=>(l.claimIds||[]).map(id=>pack.claims.find(c=>c.id===id))).filter((c,i,a)=>c&&a.indexOf(c)===i);
 const graphic=scene.__graphic; // internal dependency passed by refreshSelections, never persisted
 const selected=selectDocumentaryGraphic(claims,graphic,{previousKey});
 const data=selectionData(claims,graphic,selected);
 return {...scene.doc,...data,landmarkKind:scene.env?.id==='rus_scriptorium'?'scriptorium':claims.some(c=>c.place?.includes('Киев'))?(claims.every(c=>(c.era?.[0]||0)<988)?'kiev-early':'kiev'):['rus_port','rus_ladoga','rus_river'].includes(scene.env?.id)?'port':'settlement',mode:selected.mode,selectionVersion:SELECTION_VERSION,selectionReason:selected.reason,retrospective:false,needsReview:claims.some(c=>c.needsReview),sourceRefs:readableSources(pack,claims.flatMap(c=>c.sources)),sources:readableSources(pack,claims.flatMap(c=>c.sources)).map(s=>s.title).join('; ')};
}
export function hasGraphicCycle(scenes){const modes=scenes.map(s=>s.doc?.mode);for(let span=2;span<=4;span++)for(let start=0;start+span*3<=modes.length;start++){const block=modes.slice(start,start+span);if(new Set(block).size<2)continue;if(modes.slice(start,start+span*3).every((m,i)=>m===block[i%span]))return true;}return false;}
