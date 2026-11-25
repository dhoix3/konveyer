import type {Box} from './layout.ts';
// Conservative character-count wrapping: geometry guarantee, not a font/shaping claim.
export function wrapCaption(text:string,width:number,font:number,maxLines=3){
 const capacity=Math.max(4,Math.floor(width/(font*.72))),lines:string[]=[];
 let line='';for(const word of text.trim().split(/\s+/u)){
  for(let offset=0;offset<word.length;){const chunk=word.slice(offset,offset+capacity);offset+=chunk.length;
   if(line&&(line.length+1+chunk.length)>capacity){lines.push(line);line='';}
   line+=(line?' ':'')+chunk;
  }
 }
 if(line)lines.push(line);const overflow=lines.length>maxLines,visible=lines.slice(0,maxLines);if(overflow&&visible.length)visible[visible.length-1]=visible.at(-1)!.slice(0,capacity-1)+'…';return {lines:visible,overflow,capacity};
}
export function reviewBadge(status:string,needsReview?:boolean){
 const labels:Record<string,string>={supported:'по источнику',disputed:'спорно',hypothesis:'гипотеза',unknown:'не установлено','single-source':'один источник',unverified:'не подтверждено'};
 return status.split(' / ').map(s=>labels[s]||'статус не установлен').join(' / ')+(needsReview===false?' · подтверждено редактором':' · не проверено');
}
export type TreeNode={id:string;name:string;years:string;parent?:string|null};
// Topological order + one lane; links stay in a left gutter, never through labels.
// One visible generation per row (four rows maximum); arbitrary input order supported.
export function treeGeometry(nodes:TreeNode[]){
 const input=nodes.slice(0,4),ordered:TreeNode[]=[];const waiting=[...input];
 while(waiting.length){const at=waiting.findIndex(n=>!n.parent||!input.some(p=>p.id===n.parent)||ordered.some(p=>p.id===n.parent));ordered.push(waiting.splice(at<0?0:at,1)[0]);}
 const cards=ordered.map((n,i)=>({...n,box:{x:180,y:130+i*124,w:760,h:98} as Box}));
 const edges=cards.flatMap((n,i)=>{const p=cards.find(c=>c.id===n.parent);if(!p)return [];const lane=65+i*22;return [{from:p.id,to:n.id,points:[{x:p.box.x,y:p.box.y+p.box.h/2},{x:lane,y:p.box.y+p.box.h/2},{x:lane,y:n.box.y+n.box.h/2},{x:n.box.x,y:n.box.y+n.box.h/2}]}];});
 return {cards,edges};
}
