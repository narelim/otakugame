export function buildOutline(src,onDone){
  try{
    const img=new Image();
    img.onload=()=>{try{
      const W=img.width,H=img.height;const c=document.createElement("canvas");c.width=W;c.height=H;const ctx=c.getContext("2d");ctx.drawImage(img,0,0);
      const d=ctx.getImageData(0,0,W,H);const px=d.data;
      for(let i=0;i<px.length;i+=4){if(px[i]>238&&px[i+1]>238&&px[i+2]>238)px[i+3]=0;}
      const keyed=document.createElement("canvas");keyed.width=W;keyed.height=H;keyed.getContext("2d").putImageData(d,0,0);
      const out=document.createElement("canvas");out.width=W;out.height=H;const o=out.getContext("2d");
      const r=Math.max(4,Math.round(Math.min(W,H)*0.025));
      for(let a=0;a<16;a++){const ang=a/16*Math.PI*2;o.drawImage(keyed,Math.cos(ang)*r,Math.sin(ang)*r);}
      o.globalCompositeOperation="source-in";o.fillStyle="#ffffff";o.fillRect(0,0,W,H);
      o.globalCompositeOperation="source-over";o.drawImage(keyed,0,0);
      onDone(out.toDataURL("image/png"));
    }catch(e){onDone(null);}};
    img.onerror=()=>onDone(null);
    img.src=src;
  }catch(e){onDone(null);}
}
export function starPath(cx,cy,r){let p="";for(let i=0;i<10;i++){const ang=-Math.PI/2+i*Math.PI/5;const rad=i%2===0?r:r*0.45;p+=(i===0?"M":"L")+(cx+Math.cos(ang)*rad).toFixed(1)+","+(cy+Math.sin(ang)*rad).toFixed(1)+" ";}return p+"Z";}
export function hexToHsl(hex){let r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;const max=Math.max(r,g,b),min=Math.min(r,g,b);let h,s,l=(max+min)/2;if(max===min){h=s=0;}else{const d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;}h/=6;}return[Math.round(h*360),Math.round(s*100),Math.round(l*100)];}
export function hslToHex(h,s,l){s/=100;l/=100;const a=s*Math.min(l,1-l);const f=n=>{const k=(n+h/30)%12;const c=l-a*Math.max(Math.min(k-3,9-k,1),-1);return Math.round(255*c).toString(16).padStart(2,"0");};return`#${f(0)}${f(8)}${f(4)}`;}
export function makeDotPattern(ctx,color){const t=document.createElement("canvas");t.width=8;t.height=8;const c=t.getContext("2d");c.fillStyle=color;c.beginPath();c.arc(2,2,1.6,0,Math.PI*2);c.fill();c.beginPath();c.arc(6,6,1.6,0,Math.PI*2);c.fill();return ctx.createPattern(t,"repeat");}
export function heartPath(cx,cy,r){return `M ${cx},${cy+r*0.65} C ${cx-r*1.15},${cy-r*0.35} ${cx-r*0.55},${cy-r*1.15} ${cx},${cy-r*0.3} C ${cx+r*0.55},${cy-r*1.15} ${cx+r*1.15},${cy-r*0.35} ${cx},${cy+r*0.65} Z`;}
