export type Box={x:number;y:number;w:number;h:number};
export const intersects=(a:Box,b:Box)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
// Pixel coordinates shared by every documentary overlay and actor viewport.
export function documentaryLayout(w:number,h:number){
 const m=w*.04,g=Math.min(w,h)*.02,body={x:m,y:h*.13,w:w-2*m,h:h*.60};
 const wide=w/h>1.4;
 return {header:{x:m,y:h*.03,w:body.w,h:h*.08},
 graphics:wide?{...body,w:w*.60}:{...body,h:body.h*.58},
 actors:wide?{x:w*.68,y:body.y,w:w*.28,h:body.h}:{x:m,y:body.y+body.h*.58+g,w:body.w,h:body.h*.42-g},
 footer:{x:m,y:h*.76,w:body.w,h:h*.08},subtitles:{x:m,y:h*.86,w:body.w,h:h*.11},font:Math.max(28,Math.min(w/1080,h/1080)*30)};
}
export function fitActor(box:Box,bounds:{left:number;right:number;top:number;bottom:number}){
 const scale=Math.min(box.w/(bounds.right-bounds.left+80),box.h/(bounds.bottom-bounds.top+40));
 return {scale,x:box.w/2-(bounds.left+bounds.right)/2*scale,y:box.h/2-(bounds.top+bounds.bottom)/2*scale};
}
