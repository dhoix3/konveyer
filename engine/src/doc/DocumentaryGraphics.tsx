import React from 'react';
import {useVideoConfig} from 'remotion';
import {WORLD} from '../lib/types.ts';
export interface DocumentaryGraphic {mode: string; chapter: string; name: string; years: string; sources: string; status: string; labels: string[]; note: string}
export const DocumentaryGraphics: React.FC<{doc: DocumentaryGraphic}> = ({doc}) => {
  const {width,height}=useVideoConfig(),portrait=height>width,h=WORLD.w*height/width,margin=WORLD.w*.08;
  const font=portrait?40:25,footer=h*.74,mainScale=portrait?2.3:1,header=width/height>1.5?h*.145:h*.08;
  const short=(text:string,max:number)=>text.length>max?text.slice(0,max-1)+'…':text;
  return <svg viewBox={`0 0 ${WORLD.w} ${h}`} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
    <rect x={margin} y={header} width={WORLD.w-2*margin} height={portrait?150:66} rx={10} fill="#142525" opacity={0.9}/>
    <text x={margin+25} y={header+(portrait?85:45)} fill="#f1ddb4" fontSize={portrait?48:32}>{short(doc.chapter,portrait?48:80)}</text>
    <g transform={`translate(${margin},${portrait?h*.18:h*.25}) scale(${mainScale})`}>
      <rect width={650} height={340} rx={14} fill="#152a2c" opacity={0.92}/>
      {doc.mode==='map' && <><path d="M70 60 Q160 15 250 60 L460 30 L590 130 L470 250 L300 210 L160 280 L60 170Z" fill="#536d54"/><path d="M260 60 Q400 150 210 270" fill="none" stroke="#83b5c3" strokeWidth={9}/><text x={25} y={40} fill="white" fontSize={23}>Карта — схема, без точных границ</text></>}
      {doc.mode==='timeline' && <><path d="M45 160 H605" stroke="#d0b17c" strokeWidth={5}/><text x={30} y={40} fill="white" fontSize={25}>Таймлайн</text></>}
      {doc.mode==='tree' && <><path d="M180 85 V295 M180 85 H230 M180 155 H230 M180 225 H230 M180 295 H230" stroke="#d0b17c" strokeWidth={5}/><text x={25} y={40} fill="white" fontSize={23}>Прямая линия XVI века — ретроспектива</text></>}
      {doc.labels.map((s,i)=><text key={i} x={doc.mode==='tree'?240:70} y={90+i*70} fill="#fff1d5" fontSize={22}>{short(s,40)}</text>)}
    </g>
    <rect x={margin} y={footer} width={WORLD.w-2*margin} height={h*.09} rx={12} fill="#142525" opacity={0.92}/>
    <text x={margin+25} y={footer+font*1.4} fill="#ffe0a5" fontSize={font}>{short(`${doc.name} · ${doc.years} · ${doc.status}`,portrait?65:100)}</text>
    <text x={margin+25} y={footer+font*2.9} fill="white" fontSize={font*.85}>Источники: {doc.sources} · стилизованная схема</text>
  </svg>;
};
