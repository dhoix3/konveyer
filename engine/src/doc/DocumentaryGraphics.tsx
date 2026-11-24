import React from 'react';
import {useVideoConfig,useCurrentFrame} from 'remotion';
import {documentaryLayout} from './layout.ts';
import {MAP_CITIES,WATER,MOSCOW_TREE,TIMELINE_TICKS,publicName} from './graphic-data.ts';
export interface DocumentaryGraphic {mode:string;chapter:string;name:string;years:string;sources:string;status:string;labels:string[];note:string;retrospective?:boolean;events?:{year:number;label:string}[];person?:string;tree?:{id:string;name:string;years:string;parent:string|null}[];subjects?:{id:string;name:string;years:string;status:string;sources:string}[]}
export const DocumentaryGraphics:React.FC<{doc:DocumentaryGraphic}>=({doc})=>{
 const {width,height,fps}=useVideoConfig(),frame=useCurrentFrame(),z=documentaryLayout(width,height),progress=Math.min(1,frame/(fps*5));
 const fontScale=Math.max(1,28/(Math.min(z.graphics.w/1000,z.graphics.h/640)*30));
 const short=(s:string,n:number)=>s.length>n?s.slice(0,n-1)+'…':s;
 const events=doc.events||[],year=events[0]?.year||Number(doc.years.match(/\d{3,4}/)?.[0])||862;
 const tx=(y:number)=>80+Math.max(0,Math.min(1,(y-862)/(1598-862)))*840;
 return <div style={{position:'absolute',inset:0,fontFamily:'Koveyer Sans, sans-serif',pointerEvents:'none'}}>
 <div style={{position:'absolute',left:z.header.x,top:z.header.y,width:z.header.w,height:z.header.h,background:'#122a30',color:'#ffe0a5',display:'flex',alignItems:'center',padding:'0 20px',boxSizing:'border-box',fontSize:z.font,fontWeight:700,overflow:'hidden'}}>{short((doc.retrospective?'Ретроспектива · ':'')+doc.chapter,75)}</div>
 <svg style={{position:'absolute',left:z.graphics.x,top:z.graphics.y,width:z.graphics.w,height:z.graphics.h,background:'#142b32',borderRadius:16,fontFamily:'Koveyer Sans, sans-serif'}} viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid meet">
 <g fill="#f6edd7" fontSize={40*fontScale}>
 {doc.mode==='map'&&<>
 <path d="M80 60 L520 50 900 170 870 420 700 470 510 440 380 540 180 450 110 250Z" fill="#456b5c" stroke="#85a18c" strokeWidth={3}/>
 <path d={WATER.baltic} fill="#3e839f"/><ellipse cx={WATER.ladoga.x} cy={WATER.ladoga.y} rx={34} ry={38} fill="#3e839f"/><path d={WATER.blackSea} fill="#3e839f"/><path d={WATER.dnieper} fill="none" stroke="#65bfdf" strokeWidth={9}/>
 <text x={40} y={65} fontSize={32*fontScale}>Карта — схема</text><text x={650} y={65} fontSize={30*fontScale}>Условный путь</text><text x={60} y={240} fontSize={34*fontScale}>Балтика</text><text x={430} y={90} fontSize={34*fontScale}>Ладога</text><text x={530} y={520} fontSize={34*fontScale}>Чёрное море</text><text x={250} y={410} fontSize={34*fontScale}>Днепр</text>
 <path d="M340 160 Q480 220 410 330 L340 550" stroke="#ffd378" fill="none" strokeWidth={8} pathLength={1} strokeDasharray={1} strokeDashoffset={1-progress}/>
 {MAP_CITIES.map(c=><g key={c.name}><circle cx={c.x} cy={c.y} r={10} fill="#ffdc86"/><text x={c.name==='Константинополь'?30:c.x+14} y={c.y+18} fontSize={34*fontScale}>{c.name}</text></g>)}

 </>}
 {doc.mode==='timeline'&&<><text x={40} y={60}>Время — текущий эпизод</text><path d="M80 310 H920" stroke="#c6ab79" strokeWidth={7}/>{TIMELINE_TICKS.map((y,i)=><g key={y}><path d={`M${tx(y)} 290 v40`} stroke="#c6ab79" strokeWidth={4}/><text x={tx(y)} y={i%2?400:260} fontSize={34*fontScale} textAnchor="middle">{y}</text></g>)}<circle cx={tx(862+(year-862)*progress)} cy={310} r={16} fill="#ffd378"/><path d={`M${tx(year)} 180 V440`} stroke="#f9cf73" strokeWidth={3}/>{events.slice(0,2).map((e,i)=><text key={i} x={45} y={490+i*65} fontSize={36*fontScale} fill="#ffdc86">{e.year}: {short(e.label,40)}</text>)}</>}
 {doc.mode==='tree'&&<><text x={35} y={50} fontSize={34*fontScale}>Московская линия · ретроспектива</text><text x={35} y={95} fontSize={30*fontScale}>Даты утверждений, не жизни</text>{(doc.tree||MOSCOW_TREE).map((n,i)=>{const x=40+(i%2)*500,y=180+Math.floor(i/2)*235;return <g key={n.id}>{i>0&&<path d={`M${i%2?x-500+410:x+500+205} ${i%2?y+55:y-235+110} V${y+55} H${x}`} stroke="#c6ab79" strokeWidth={5} fill="none" markerEnd="url(#arrow)"/>}<rect x={x} y={y} width={410} height={110} rx={12} fill={doc.name.includes(n.name)?'#72572b':'#26494d'} stroke="#d0b17c" strokeWidth={2}/><text x={x+205} y={y+43} textAnchor="middle" fontSize={32*fontScale}>{n.name}</text><text x={x+205} y={y+86} textAnchor="middle" fontSize={30*fontScale}>{n.years}</text></g>;})}<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 0 8Z" fill="#c6ab79"/></marker></defs></>}
 </g></svg>
 <div style={{position:'absolute',left:z.footer.x,top:z.footer.y,width:z.footer.w,height:z.footer.h,boxSizing:'border-box',padding:'4px 16px',background:'#122a30',color:'#fff1d5',fontSize:z.font,overflow:'hidden',display:'flex',flexDirection:'column',justifyContent:'space-around'}}>
 <div style={{display:'flex',gap:12,whiteSpace:'nowrap',overflow:'hidden',lineHeight:1.05}}><strong style={{minWidth:0,flex:1,overflow:'hidden',textOverflow:'ellipsis'}}>{short(publicName(doc.name)||'Исторический эпизод',45)}</strong><span style={{padding:'2px 10px',background:'#3d4e49',maxWidth:'52%',overflow:'hidden',textOverflow:'ellipsis'}}>{short(doc.years,25)} · {short(doc.status,24)}</span></div><div style={{fontSize:z.font,lineHeight:1.05,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>Источники: {short(doc.sources,85)}</div>
 </div></div>;
};
