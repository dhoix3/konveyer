import {WORLD} from './types.ts';
export const ASPECTS={'16:9':{width:1920,height:1080},'9:16':{width:1080,height:1920},'1:1':{width:1080,height:1080}} as const;
export function outputSize(aspect?: string): {width:number;height:number} {
  if(!aspect)return {width:WORLD.w,height:WORLD.h};
  if(!Object.hasOwn(ASPECTS,aspect))throw new Error(`Unsupported aspect: ${aspect}`);
  return {...ASPECTS[aspect as keyof typeof ASPECTS]};
}
export function viewport(width: number,height: number) {
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('Invalid viewport');
  return {w:WORLD.h*width/height,h:WORLD.h,cx:WORLD.h*width/height/2,cy:WORLD.h/2,safe:{left:width*.08,right:width*.92,top:height*.08,bottom:height*.84}};
}
