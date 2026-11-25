import React,{useEffect,useRef,useState} from 'react';
import {delayRender,continueRender,useCurrentFrame,useVideoConfig} from 'remotion';
export const TextBounds:React.FC=()=>{
 const ref=useRef<HTMLDivElement>(null),frame=useCurrentFrame(),{width,height}=useVideoConfig();
 const [handle]=useState(()=>delayRender('Measure text bounds after font/layout readiness'));
 useEffect(()=>{let alive=true;(async()=>{try{
 await document.fonts.ready;await new Promise<void>(r=>requestAnimationFrame(()=>r()));if(!alive)return;
 const root=ref.current!.getBoundingClientRect(),sx=width/root.width,sy=height/root.height;
 const box=(r:DOMRect)=>({x:(r.left-root.left)*sx,y:(r.top-root.top)*sy,w:r.width*sx,h:r.height*sy});
 const outside=(a:ReturnType<typeof box>,b:ReturnType<typeof box>)=>a.x<b.x-1||a.y<b.y-1||a.x+a.w>b.x+b.w+1||a.y+a.h>b.y+b.h+1;
 const elements=Array.from(document.querySelectorAll('svg text,div,span,strong,p,h1,h2,h3')).flatMap(node=>{
 if(node.tagName.toLowerCase()!=='text'&&(node.children.length||!node.textContent?.trim()))return [];
 const style=getComputedStyle(node),range=document.createRange();range.selectNodeContents(node);const rect=node.tagName.toLowerCase()==='text'?node.getBoundingClientRect():range.getBoundingClientRect();if(style.display==='none'||style.visibility==='hidden'||!rect.width||!rect.height)return [];
 const bounds=box(rect),clippedBy:string[]=[];let p=node.parentElement;
 while(p&&p!==document.body){if(['hidden','clip','scroll','auto'].includes(getComputedStyle(p).overflow)&&outside(bounds,box(p.getBoundingClientRect())))clippedBy.push(p.tagName);p=p.parentElement;}
 return outside(bounds,{x:0,y:0,w:width,h:height})||clippedBy.length?[{text:node.textContent?.slice(0,400),bounds,outsideFrame:outside(bounds,{x:0,y:0,w:width,h:height}),clippedBy}]:[];});
 console.log('KOVEYER_TEXT_BOUNDS:'+JSON.stringify({frame,width,height,overflow:elements}));
 }finally{continueRender(handle);}})().catch(e=>console.error('KOVEYER_TEXT_BOUNDS_ERROR:'+String(e)));return()=>{alive=false;continueRender(handle);};},[frame,width,height,handle]);
 return <div ref={ref} style={{position:'absolute',inset:0,pointerEvents:'none'}}/>;
};
