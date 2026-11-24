import React,{useEffect,useState} from 'react';
import {staticFile,delayRender,continueRender,cancelRender} from 'remotion';
export const LocalFonts:React.FC=()=>{
 const [handle]=useState(()=>delayRender('Local OFL Cyrillic font'));
 useEffect(()=>{let mounted=true;const font=new FontFace('Koveyer Sans',`url(${staticFile('fonts/NotoSans.ttf')})`,{weight:'100 900'});
 font.load().then(f=>{document.fonts.add(f);if(mounted)continueRender(handle);}).catch(e=>cancelRender(e));return()=>{mounted=false;};},[handle]);
 return <style>{`@font-face{font-family:'Koveyer Sans';src:url('${staticFile('fonts/NotoSans.ttf')}') format('truetype');font-weight:100 900;font-style:normal;font-display:block;}`}</style>;
};
