import {wrapCaption,treeGeometry,reviewBadge} from './composition.ts';
import React from 'react';
import {useVideoConfig,useCurrentFrame} from 'remotion';
import {documentaryLayout} from './layout.ts';
import {MAP_CITIES,WATER,MOSCOW_TREE,TIMELINE_TICKS,publicName} from './graphic-data.ts';
export interface DocumentaryGraphic {mode:string;selectionReason?:string;needsReview?:boolean;sourceRefs?:{id:string;title:string}[];chapter:string;name:string;years:string;sources:string;status:string;labels:string[];note:string;retrospective?:boolean;profile?:string;mapData?:{places:{id:string;label:string;x:number;y:number}[];routes:{from:string;to:string}[]};ticks?:number[];events?:{year?:number;label:string}[];person?:string;tree?:{id:string;name:string;years:string;parent:string|null}[];subjects?:{id:string;name:string;years:string;status:string;sources:string;needsReview?:boolean;sourceRefs?:{id:string;title:string}[]}[]}
export const DocumentaryGraphics:React.FC<{doc:DocumentaryGraphic}>=({doc})=>{
 const {width,height,fps}=useVideoConfig(),frame=useCurrentFrame(),z=documentaryLayout(width,height),progress=Math.min(1,frame/(fps*5));
 const fontScale=Math.max(1,28/(Math.min(z.graphics.w/1000,z.graphics.h/640)*30));
 const badge=reviewBadge(doc.status,doc.needsReview);
 const heading=wrapCaption((doc.retrospective?'Ретроспектива · ':'')+doc.chapter,z.header.w-40,z.font,2);
 const sourceNames=doc.sourceRefs?.map(s=>s.title)||[doc.sources];
 const sourceLabel=sourceNames.length?shortSource(sourceNames[0],width>height?55:32)+(sourceNames.length>1?' · ещё '+(sourceNames.length-1):''):'не указан';
 function shortSource(s:string,n:number){return s.length>n?s.slice(0,n-1)+'…':s;}
 const short=(s:string,n:number)=>s.length>n?s.slice(0,n-1)+'…':s;
 const legacy=!doc.profile||doc.profile==='rurikids';
 const events=doc.events||[],ticks=doc.ticks??(legacy?TIMELINE_TICKS:[]),known=events.filter(e=>Number.isFinite(e.year)),year=known[0]?.year;
 const min=Math.min(...ticks,...known.map(e=>e.year!)),max=Math.max(...ticks,...known.map(e=>e.year!));
 const tx=(y:number)=>min===max?500:80+Math.max(0,Math.min(1,(y-min)/(max-min)))*840;
 const places=doc.mapData?.places||MAP_CITIES.map((c,i)=>({id:String(i),label:c.name,x:c.x/1000,y:c.y/640}));
 const nodes=doc.tree||(legacy?MOSCOW_TREE:[]);
 const tree=treeGeometry(nodes);
 const eventFont=36*fontScale;
 const evidence=wrapCaption(doc.events?.[0]?.label||doc.labels.join(' · ')||doc.chapter,900,eventFont,Math.floor(455/(eventFont*1.25))+1);
 return <div style={{position:'absolute',inset:0,fontFamily:'Koveyer Sans, sans-serif',pointerEvents:'none'}}>
 <div style={{position:'absolute',left:z.header.x,top:z.header.y,width:z.header.w,height:z.header.h,background:'#122a30',color:'#ffe0a5',display:'flex',alignItems:'center',padding:'0 20px',boxSizing:'border-box',fontSize:z.font,fontWeight:700,lineHeight:1.14}}><div>{heading.lines.map((line,i)=><div key={i}>{line}</div>)}</div></div>
 <svg style={{position:'absolute',left:z.graphics.x,top:z.graphics.y,width:z.graphics.w,height:z.graphics.h,background:'rgba(20,43,50,.87)',borderRadius:16,fontFamily:'Koveyer Sans, sans-serif'}} viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid meet">
 <g fill="#f6edd7" fontSize={40*fontScale}>
 {doc.mode==='map'&&<>
 {legacy&&<>
 <path d="M80 60 L520 50 900 170 870 420 700 470 510 440 380 540 180 450 110 250Z" fill="#456b5c" stroke="#85a18c" strokeWidth={3}/>
 <path d={WATER.baltic} fill="#3e839f"/><ellipse cx={WATER.ladoga.x} cy={WATER.ladoga.y} rx={34} ry={38} fill="#3e839f"/><path d={WATER.blackSea} fill="#3e839f"/><path d={WATER.dnieper} fill="none" stroke="#65bfdf" strokeWidth={9}/>
 <text x={40} y={65} fontSize={32*fontScale}>Карта — схема</text><text x={650} y={65} fontSize={30*fontScale}>Условный путь</text><text x={60} y={240} fontSize={34*fontScale}>Балтика</text><text x={430} y={90} fontSize={34*fontScale}>Ладога</text><text x={530} y={520} fontSize={34*fontScale}>Чёрное море</text><text x={250} y={410} fontSize={34*fontScale}>Днепр</text>
 <path d="M340 160 Q480 220 410 330 L340 550" stroke="#ffd378" fill="none" strokeWidth={8} pathLength={1} strokeDasharray={1} strokeDashoffset={1-progress}/>
 </>}
 {!legacy&&<><text x={40} y={65} fontSize={32*fontScale}>Места и связи · условная схема</text>{(doc.mapData?.routes||[]).map((r,i)=>{const a=places.find(p=>p.id===r.from),b=places.find(p=>p.id===r.to);return a&&b?<path key={i} d={`M${80+a.x*840} ${120+a.y*440} L${80+b.x*840} ${120+b.y*440}`} stroke="#ffd378" strokeWidth={5}/>:null;})}</>}
 {places.map(c=><g key={c.id}><circle cx={legacy?c.x*1000:80+c.x*840} cy={legacy?c.y*640:120+c.y*440} r={10} fill="#ffdc86"/><text x={Math.min(730,(legacy?c.x*1000:80+c.x*840)+14)} y={(legacy?c.y*640:120+c.y*440)+18} fontSize={34*fontScale}>{short(c.label,25)}</text></g>)}

 </>}
 {doc.mode==='timeline'&&<><text x={40} y={60}>Время — текущий эпизод</text><path d="M80 310 H920" stroke="#c6ab79" strokeWidth={7}/>{ticks.filter((_,i)=>ticks.length<=7||i%Math.ceil(ticks.length/7)===0||i===ticks.length-1).map((y,i)=><g key={y}><path d={`M${tx(y)} 290 v40`} stroke="#c6ab79" strokeWidth={4}/><text x={tx(y)} y={i%2?400:260} fontSize={34*fontScale} textAnchor="middle">{y}</text></g>)}{year!==undefined&&<><circle cx={tx(min+(year-min)*progress)} cy={310} r={16} fill="#ffd378"/><path d={`M${tx(year)} 180 V440`} stroke="#f9cf73" strokeWidth={3}/></>}{!known.length&&<text x={80} y={250} fontSize={34*fontScale}>Точные годы в материалах не указаны</text>}{events.slice(0,2).map((e,i)=>{const lines=wrapCaption((e.year!==undefined?e.year+': ':'')+e.label,900,30*fontScale,2).lines;return <text key={i} x={45} y={455+i*90} fontSize={30*fontScale} fill="#ffdc86">{lines.map((line,j)=><tspan key={j} x={45} dy={j?34*fontScale:0}>{line}</tspan>)}</text>;})}</>}
 {doc.mode==='tree'&&<><text x={35} y={50} fontSize={32*fontScale}>Родство · по материалам</text><text x={35} y={95} fontSize={28*fontScale}>Даты утверждений, не жизни</text>
 {tree.edges.map(e=><polyline key={e.from+'-'+e.to} points={e.points.map(p=>p.x+','+p.y).join(' ')} stroke="#c6ab79" strokeWidth={4} fill="none"/>)}
 {tree.cards.map(n=><g key={n.id}><rect x={n.box.x} y={n.box.y} width={n.box.w} height={n.box.h} rx={12} fill={doc.name.includes(n.name)?'#72572b':'#26494d'} stroke="#d0b17c" strokeWidth={2}/><text x={n.box.x+24} y={n.box.y+39} fontSize={30*fontScale}>{wrapCaption(n.name,712,30*fontScale,1).lines[0]}</text><text x={n.box.x+24} y={n.box.y+80} fontSize={28*fontScale}>{wrapCaption(n.years||'дата не указана',712,28*fontScale,1).lines[0]}</text></g>)}</>}
 {doc.mode==='evidence'&&<><text x={40} y={65} fontSize={32*fontScale}>Утверждение · требуется проверка</text><text x={45} y={155} fontSize={eventFont}>{evidence.lines.map((line,i)=><tspan key={i} x={45} dy={i?eventFont*1.25:0}>{line}</tspan>)}</text></>}

 </g></svg>
 <div style={{position:'absolute',left:z.footer.x,top:z.footer.y,width:z.footer.w,height:z.footer.h,boxSizing:'border-box',padding:'4px 16px',background:'rgba(18,42,48,.94)',color:'#fff1d5',fontSize:z.font,lineHeight:1.13,display:'flex',flexDirection:'column',justifyContent:'space-around'}}>
 <div style={{display:'flex',justifyContent:'space-between',gap:12}}><strong>{short(publicName(doc.name)||'Эпизод исследования',width>height?40:25)}</strong><span>{short(doc.years,25)}</span></div>
 <div style={{fontSize:z.font*.86}}>{badge}</div><div style={{fontSize:z.font*.86}}>Источник: {sourceLabel}</div>
 </div></div>;
};
