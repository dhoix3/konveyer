// Content selection only; scene index is intentionally not an input.
export function selectDocumentaryGraphic(claims,graphic){
 const ids=new Set(claims.map(c=>c.id)),text=claims.map(c=>c.text+' '+(c.narration||'')).join(' ');
 const related=v=>!v.claimIds||v.claimIds.some(id=>ids.has(id));
 const places=graphic.places.filter(related).filter(p=>graphic.profile!=='rurikids'||claims.some(c=>(c.place||'').includes(p.label)));
 const relation=/\b(genealog\w*|parent|father|mother|son|daughter|family)\b|сын|доч[ьи]|отц|отец|родослов|родств|семь[яи]/iu.test(text);
 const tree=graphic.tree.filter(related);
 if(relation&&tree.length>=2)return {mode:'tree',reason:'Утверждение описывает родство; узлы заданы в материалах',tree,places};
 const movement=/\b(route|journey|travel|migration|conquest)\b|поход|маршрут|захват|нашеств|перемещ|пут[ьи]|прибыл/iu.test(text);
 if(places.length&&(movement||graphic.routes.some(r=>related(r)&&places.some(p=>p.id===r.from)&&places.some(p=>p.id===r.to))))return {mode:'map',reason:'Пространственное событие и места связаны с материалами',tree:[],places};
 if(claims.some(c=>c.date.precision!=='unknown'&&c.date.value.trim()))return {mode:'timeline',reason:'Утверждение содержит датированное событие',tree:[],places:[]};
 return {mode:'evidence',reason:'Нет данных для карты, даты или родства: показывается само утверждение',tree:[],places:[]};
}
export function readableSources(pack,ids){return [...new Set(ids)].map(id=>{
 const source=pack.sources.find(s=>s.id===id);return {id,title:source?.shortTitle||source?.title||'Источник не указан'};
});}
