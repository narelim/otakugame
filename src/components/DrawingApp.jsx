import { useState, useEffect, useRef } from "react";
import { DRAW_RATIOS, BLEND_MODES, MAX_LAYERS, MAX_SAVES, SAVE_KEY, TOOLS, PALETTE } from "../data/gameData.js";
import { hexToHsl, hslToHex, makeDotPattern } from "../utils/draw.js";

function ColorPicker({color,onChange}){
  const [hsl,setHsl]=useState(()=>hexToHsl(color));
  const [hexInput,setHexInput]=useState(color);
  const svRef=useRef(null),hueRef=useRef(null);
  const dragSV=useRef(false),dragH=useRef(false);
  useEffect(()=>{const cv=svRef.current;if(!cv)return;const ctx=cv.getContext("2d");const gW=ctx.createLinearGradient(0,0,cv.width,0);gW.addColorStop(0,"#fff");gW.addColorStop(1,`hsl(${hsl[0]},100%,50%)`);ctx.fillStyle=gW;ctx.fillRect(0,0,cv.width,cv.height);const gB=ctx.createLinearGradient(0,0,0,cv.height);gB.addColorStop(0,"rgba(0,0,0,0)");gB.addColorStop(1,"#000");ctx.fillStyle=gB;ctx.fillRect(0,0,cv.width,cv.height);},[hsl[0]]);
  useEffect(()=>{const cv=hueRef.current;if(!cv)return;const ctx=cv.getContext("2d");const g=ctx.createLinearGradient(0,0,cv.width,0);[0,60,120,180,240,300,360].forEach((d,i)=>g.addColorStop(i/6,`hsl(${d},100%,50%)`));ctx.fillStyle=g;ctx.fillRect(0,0,cv.width,cv.height);},[]);
  const svPos=()=>{const[,s,l]=hsl;const sv_v=l/100+s/100*Math.min(l/100,1-l/100);const sv_s=sv_v===0?0:2*(1-l/100/sv_v);return{x:sv_s*100,y:(1-sv_v)*100};};
  const pickSV=(e,cv)=>{const r=cv.getBoundingClientRect();const cx=e.touches?e.touches[0].clientX:e.clientX;const cy=e.touches?e.touches[0].clientY:e.clientY;const x=Math.max(0,Math.min(1,(cx-r.left)/r.width));const y=Math.max(0,Math.min(1,(cy-r.top)/r.height));const v=1-y,sl=x,l=v*(1-sl/2);const s=l===0||l===1?0:(v-l)/Math.min(l,1-l);const nh=[hsl[0],Math.round(s*100),Math.round(l*100)];const hex=hslToHex(...nh);setHsl(nh);setHexInput(hex);onChange(hex);};
  const pickH=(e,cv)=>{const r=cv.getBoundingClientRect();const cx=e.touches?e.touches[0].clientX:e.clientX;const h=Math.round(Math.max(0,Math.min(360,((cx-r.left)/r.width)*360)));const nh=[h,hsl[1],hsl[2]];const hex=hslToHex(...nh);setHsl(nh);setHexInput(hex);onChange(hex);};
  const pos=svPos();
  return(<div style={{padding:"8px",background:"#0d0d1a",userSelect:"none"}}>
    <div style={{position:"relative",marginBottom:"8px"}}>
      <canvas ref={svRef} width={220} height={130} style={{display:"block",width:"100%",borderRadius:"6px",cursor:"crosshair",touchAction:"none"}} onMouseDown={e=>{dragSV.current=true;pickSV(e,svRef.current);}} onMouseMove={e=>{if(dragSV.current)pickSV(e,svRef.current);}} onMouseUp={()=>dragSV.current=false} onMouseLeave={()=>dragSV.current=false} onTouchStart={e=>{e.preventDefault();dragSV.current=true;pickSV(e,svRef.current);}} onTouchMove={e=>{e.preventDefault();if(dragSV.current)pickSV(e,svRef.current);}} onTouchEnd={()=>dragSV.current=false}/>
      <div style={{position:"absolute",left:`${pos.x}%`,top:`${pos.y}%`,width:"12px",height:"12px",borderRadius:"50%",border:"2px solid #fff",boxShadow:"0 0 4px rgba(0,0,0,0.8)",transform:"translate(-50%,-50%)",pointerEvents:"none",background:color}}/>
    </div>
    <div style={{position:"relative",marginBottom:"8px"}}>
      <canvas ref={hueRef} width={220} height={14} style={{display:"block",width:"100%",borderRadius:"4px",cursor:"ew-resize",touchAction:"none"}} onMouseDown={e=>{dragH.current=true;pickH(e,hueRef.current);}} onMouseMove={e=>{if(dragH.current)pickH(e,hueRef.current);}} onMouseUp={()=>dragH.current=false} onMouseLeave={()=>dragH.current=false} onTouchStart={e=>{e.preventDefault();dragH.current=true;pickH(e,hueRef.current);}} onTouchMove={e=>{e.preventDefault();if(dragH.current)pickH(e,hueRef.current);}} onTouchEnd={()=>dragH.current=false}/>
      <div style={{position:"absolute",top:"50%",left:`${hsl[0]/360*100}%`,width:"14px",height:"14px",borderRadius:"50%",border:"2px solid #fff",boxShadow:"0 0 4px rgba(0,0,0,0.8)",transform:"translate(-50%,-50%)",pointerEvents:"none",background:`hsl(${hsl[0]},100%,50%)`}}/>
    </div>
    <div style={{display:"flex",gap:"6px",alignItems:"center",marginBottom:"8px"}}>
      <div style={{width:"26px",height:"26px",borderRadius:"5px",background:color,border:"1px solid #444",flexShrink:0}}/>
      <input value={hexInput} onChange={e=>{const v=e.target.value;setHexInput(v);if(/^#[0-9a-fA-F]{6}$/.test(v)){setHsl(hexToHsl(v));onChange(v);}}} style={{flex:1,padding:"3px 7px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#e0e0ff",borderRadius:"6px",fontSize:"12px",fontFamily:"monospace"}}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:"2px"}}>
      {PALETTE.map(c=><div key={c} onClick={()=>{setHsl(hexToHsl(c));setHexInput(c);onChange(c);}} style={{aspectRatio:"1",borderRadius:"3px",background:c,cursor:"pointer",border:color===c?"2px solid #fff":"1px solid rgba(255,255,255,0.08)"}}/>)}
    </div>
  </div>);
}

const miniBtn=(disabled)=>({flex:1,padding:"3px 0",background:"#1a1a3a",border:"1px solid #2a2a4a",color:disabled?"#444":"#aaa",borderRadius:"4px",cursor:disabled?"not-allowed":"pointer",fontSize:"9px"});

function LayerPanel({layers,activeId,onSelect,onProp,onAdd,onDelete,onMove,onMerge,onClose,max}){
  const active=layers.find(l=>l.id===activeId);
  return(<div style={{position:"absolute",top:0,right:0,bottom:0,width:"168px",background:"#0f0f24",borderLeft:"1px solid #2a2a4a",zIndex:150,display:"flex",flexDirection:"column",boxShadow:"-8px 0 24px rgba(0,0,0,0.5)"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",borderBottom:"1px solid #2a2a4a",flexShrink:0}}>
      <div style={{fontSize:"12px",fontWeight:"700",color:"#c084fc"}}>레이어 {layers.length}/{max}</div>
      <div style={{display:"flex",gap:"4px"}}>
        <button onClick={onAdd} style={{padding:"3px 8px",background:"#7c3aed",border:"none",color:"#fff",borderRadius:"5px",cursor:"pointer",fontSize:"13px",fontWeight:"700"}}>＋</button>
        <button onClick={onClose} style={{padding:"3px 8px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#888",borderRadius:"5px",cursor:"pointer",fontSize:"12px"}}>✕</button>
      </div>
    </div>
    <div style={{flex:1,overflow:"auto",padding:"6px"}}>
      {layers.map((l,i)=>(
        <div key={l.id} onClick={()=>onSelect(l.id)} style={{marginBottom:"5px",padding:"6px",borderRadius:"8px",background:l.id===activeId?"#2a1a4a":"#14142e",border:`1px solid ${l.id===activeId?"#7c3aed":"#2a2a4a"}`,cursor:"pointer"}}>
          <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
            <button onClick={e=>{e.stopPropagation();onProp(l.id,{visible:!l.visible});}} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:"14px",padding:0,opacity:l.visible?1:0.35}}>{l.visible?"👁":"🚫"}</button>
            <img src={l.thumb||""} alt="" style={{width:"30px",height:"30px",borderRadius:"4px",background:"#fff",objectFit:"cover",border:"1px solid #2a2a4a",flexShrink:0}}/>
            <div style={{flex:1,fontSize:"11px",fontWeight:l.id===activeId?"700":"400",color:l.id===activeId?"#e0e0ff":"#999",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.name}</div>
          </div>
          <div style={{display:"flex",gap:"3px",marginTop:"5px"}}>
            <button onClick={e=>{e.stopPropagation();onMove(l.id,-1);}} disabled={i===0} style={miniBtn(i===0)}>▲</button>
            <button onClick={e=>{e.stopPropagation();onMove(l.id,1);}} disabled={i===layers.length-1} style={miniBtn(i===layers.length-1)}>▼</button>
            <button onClick={e=>{e.stopPropagation();onMerge(l.id);}} disabled={i===layers.length-1} style={miniBtn(i===layers.length-1)}>합치기</button>
            <button onClick={e=>{e.stopPropagation();onDelete(l.id);}} disabled={layers.length<=1} style={{...miniBtn(layers.length<=1),color:layers.length<=1?"#444":"#e94560"}}>🗑</button>
          </div>
        </div>
      ))}
    </div>
    {active&&<div style={{padding:"8px 10px",borderTop:"1px solid #2a2a4a",flexShrink:0,background:"#0d0d1a"}}>
      <div style={{fontSize:"9px",color:"#666",marginBottom:"3px"}}>불투명도 {Math.round(active.opacity*100)}%</div>
      <input type="range" min="0" max="100" value={Math.round(active.opacity*100)} onChange={e=>onProp(active.id,{opacity:Number(e.target.value)/100})} style={{width:"100%",accentColor:"#7c3aed"}}/>
      <div style={{fontSize:"9px",color:"#666",margin:"6px 0 3px"}}>합성 모드</div>
      <select value={active.blend} onChange={e=>onProp(active.id,{blend:e.target.value})} style={{width:"100%",padding:"4px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#e0e0ff",borderRadius:"5px",fontSize:"11px"}}>
        {BLEND_MODES.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}
      </select>
    </div>}
  </div>);
}

function SaveListModal({saves,onLoad,onDelete,onClose,max}){
  return(<div style={{position:"absolute",inset:0,zIndex:300,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:"360px",maxHeight:"80%",background:"#12122a",border:"1px solid #3a3a6a",borderRadius:"14px",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:"1px solid #2a2a4a"}}>
        <div style={{fontSize:"13px",fontWeight:"700",color:"#c084fc"}}>📂 세이브 ({saves.length}/{max})</div>
        <button onClick={onClose} style={{background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#888",borderRadius:"6px",cursor:"pointer",padding:"4px 10px",fontSize:"12px"}}>닫기</button>
      </div>
      <div style={{flex:1,overflow:"auto",padding:"10px"}}>
        {!saves.length&&<div style={{textAlign:"center",color:"#555",padding:"30px",fontSize:"12px"}}>저장된 그림이 없어요</div>}
        {saves.map(s=>(
          <div key={s.id} style={{display:"flex",gap:"10px",alignItems:"center",padding:"8px",marginBottom:"7px",background:"#0d0d22",borderRadius:"10px",border:"1px solid #2a2a4a"}}>
            <img src={s.thumb} alt="" style={{width:"46px",height:"46px",objectFit:"contain",background:"#fff",borderRadius:"6px",flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:"12px",fontWeight:"700",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div><div style={{fontSize:"9px",color:"#666"}}>{s.ts} · {s.layers.length}L · {s.ratioId}</div></div>
            <button onClick={()=>onLoad(s)} style={{padding:"5px 10px",background:"linear-gradient(135deg,#7c3aed,#e94560)",border:"none",color:"#fff",borderRadius:"6px",cursor:"pointer",fontSize:"11px",fontWeight:"700",flexShrink:0}}>불러오기</button>
            <button onClick={()=>onDelete(s.id)} style={{padding:"5px 8px",background:"#2a0a0a",border:"1px solid #e94560",color:"#e94560",borderRadius:"6px",cursor:"pointer",fontSize:"11px",flexShrink:0}}>🗑</button>
          </div>
        ))}
      </div>
    </div>
  </div>);
}

export function DrawingApp({goodsType,onComplete,onCancel}){
  const [ratioId,setRatioId]=useState("1:1");
  const csz=DRAW_RATIOS.find(r=>r.id===ratioId);
  const [tool,setTool]=useState("pen");
  const [color,setColor]=useState("#e94560");
  const [brushSize,setBrushSize]=useState(6);
  const [showPicker,setShowPicker]=useState(false);
  const [showLayers,setShowLayers]=useState(false);
  const [showSaves,setShowSaves]=useState(false);
  const [recentColors,setRecentColors]=useState(["#e94560","#ffd166","#06d6a0","#4cc9f0","#c084fc","#ffffff"]);
  const [layers,setLayers]=useState([{id:1,name:"레이어 1",visible:true,opacity:1,blend:"source-over",thumb:null}]);
  const [activeId,setActiveId]=useState(1);
  const [selRect,setSelRect]=useState(null);
  const [saves,setSaves]=useState([]);
  const [msg,setMsg]=useState(null);

  const displayRef=useRef(null);
  const canvasesRef=useRef({});
  const idRef=useRef(2);
  const isDown=useRef(false);
  const lastPos=useRef(null);
  const startPos=useRef(null);
  const pendingRect=useRef(null);
  const undoRef=useRef([]);
  const moveData=useRef(null);
  const selMode=useRef(null);
  const selData=useRef(null);
  const bufferRef=useRef(null);
  const layersRef=useRef(layers); layersRef.current=layers;
  const selRectRef=useRef(selRect); selRectRef.current=selRect;
  const activeIdRef=useRef(activeId); activeIdRef.current=activeId;

  const nid=()=>idRef.current++;
  const activeCanvas=()=>canvasesRef.current[activeIdRef.current];
  const activeCtx=()=>activeCanvas()?.getContext("2d");
  const inside=(p,r)=>!!r&&p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
  const getPos=(e)=>{const cv=displayRef.current;const r=cv.getBoundingClientRect();const sx=cv.width/r.width,sy=cv.height/r.height;const src=e.touches?e.touches[0]:e;return{x:(src.clientX-r.left)*sx,y:(src.clientY-r.top)*sy};};

  const getBuffer=()=>{let b=bufferRef.current;if(!b){b=document.createElement("canvas");bufferRef.current=b;}if(b.width!==csz.w||b.height!==csz.h){b.width=csz.w;b.height=csz.h;}return b;};
  const stackToBuffer=()=>{const buf=getBuffer();const bctx=buf.getContext("2d");bctx.clearRect(0,0,buf.width,buf.height);bctx.globalAlpha=1;bctx.globalCompositeOperation="source-over";const ls=layersRef.current;for(let i=ls.length-1;i>=0;i--){const l=ls[i];if(!l.visible)continue;const c=canvasesRef.current[l.id];if(!c)continue;bctx.globalAlpha=l.opacity;bctx.globalCompositeOperation=l.blend;bctx.drawImage(c,0,0);}bctx.globalAlpha=1;bctx.globalCompositeOperation="source-over";return buf;};
  const composite=()=>{
    const disp=displayRef.current;if(!disp)return;const ctx=disp.getContext("2d");
    const buf=stackToBuffer();
    ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";
    ctx.clearRect(0,0,disp.width,disp.height);
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,disp.width,disp.height);
    ctx.drawImage(buf,0,0);
    const sr=selRectRef.current;
    if(sr&&sr.w>0&&sr.h>0){ctx.save();ctx.strokeStyle="#4cc9f0";ctx.setLineDash([5,4]);ctx.lineWidth=1;ctx.strokeRect(sr.x+0.5,sr.y+0.5,sr.w,sr.h);ctx.restore();}
  };

  const updateThumbs=()=>{setLayers(ls=>ls.map(l=>{const c=canvasesRef.current[l.id];if(!c)return l;const t=document.createElement("canvas");t.width=36;t.height=36;const tc=t.getContext("2d");tc.fillStyle="#15152e";tc.fillRect(0,0,36,36);tc.drawImage(c,0,0,36,36);return{...l,thumb:t.toDataURL("image/png")};}));};
  const pushUndo=()=>{const c=activeCanvas();if(!c)return;try{undoRef.current=[...undoRef.current.slice(-19),{id:activeIdRef.current,data:c.getContext("2d").getImageData(0,0,c.width,c.height)}];}catch(e){}};
  const undo=()=>{const last=undoRef.current[undoRef.current.length-1];if(!last)return;const c=canvasesRef.current[last.id];if(c)c.getContext("2d").putImageData(last.data,0,0);undoRef.current=undoRef.current.slice(0,-1);composite();updateThumbs();};
  const pickColor=(c)=>{setColor(c);setRecentColors(p=>[c,...p.filter(x=>x!==c)].slice(0,6));};
  const pickAt=(pos)=>{const disp=displayRef.current;const x=Math.max(0,Math.min(disp.width-1,Math.round(pos.x))),y=Math.max(0,Math.min(disp.height-1,Math.round(pos.y)));const d=disp.getContext("2d").getImageData(x,y,1,1).data;const hex="#"+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,"0")).join("");pickColor(hex);setMsg({t:`색 추출: ${hex}`,bad:false});};

  useEffect(()=>{try{const raw=localStorage.getItem(SAVE_KEY);if(raw)setSaves(JSON.parse(raw));}catch(e){}},[]);
  useEffect(()=>{
    const ids=new Set(layers.map(l=>l.id));
    layers.forEach(l=>{let c=canvasesRef.current[l.id];if(!c){c=document.createElement("canvas");c.width=csz.w;c.height=csz.h;canvasesRef.current[l.id]=c;}else if(c.width!==csz.w||c.height!==csz.h){c.width=csz.w;c.height=csz.h;}});
    Object.keys(canvasesRef.current).forEach(k=>{if(!ids.has(Number(k)))delete canvasesRef.current[k];});
    composite();
  },[layers,csz.w,csz.h,selRect]);
  useEffect(()=>{const cv=displayRef.current;if(!cv)return;const stop=(e)=>{if(e.target===cv)e.preventDefault();};cv.addEventListener("touchstart",stop,{passive:false});cv.addEventListener("touchmove",stop,{passive:false});cv.addEventListener("touchend",stop,{passive:false});return()=>{cv.removeEventListener("touchstart",stop);cv.removeEventListener("touchmove",stop);cv.removeEventListener("touchend",stop);};},[]);
  useEffect(()=>{if(!msg)return;const t=setTimeout(()=>setMsg(null),2200);return()=>clearTimeout(t);},[msg]);

  const startDraw=(e)=>{
    setShowPicker(false);
    const pos=getPos(e);lastPos.current=pos;startPos.current=pos;
    if(tool==="eyedropper"){pickAt(pos);return;}
    const lay=layers.find(l=>l.id===activeId);
    if(!lay||!lay.visible){setMsg({t:"숨긴 레이어에는 그릴 수 없어요",bad:true});return;}
    const ctx=activeCtx();if(!ctx)return;
    isDown.current=true;
    if(tool==="move"){moveData.current={start:pos,data:ctx.getImageData(0,0,csz.w,csz.h)};return;}
    if(tool==="select"){
      if(inside(pos,selRect)){
        const region=ctx.getImageData(selRect.x,selRect.y,selRect.w,selRect.h);
        ctx.clearRect(selRect.x,selRect.y,selRect.w,selRect.h);
        const base=ctx.getImageData(0,0,csz.w,csz.h);
        const rc=document.createElement("canvas");rc.width=selRect.w;rc.height=selRect.h;rc.getContext("2d").putImageData(region,0,0);
        selData.current={start:pos,rect:{...selRect},base,regionCanvas:rc};selMode.current="move";composite();
      }else{selMode.current="new";setSelRect({x:pos.x,y:pos.y,w:0,h:0});}
      return;
    }
    if(tool==="rect"){pushUndo();return;}
    pushUndo();
    ctx.save();ctx.lineCap="round";ctx.lineJoin="round";
    if(tool==="eraser"){ctx.globalCompositeOperation="destination-out";ctx.fillStyle="rgba(0,0,0,1)";}
    else if(tool==="pattern"){ctx.globalCompositeOperation="source-over";ctx.fillStyle=makeDotPattern(ctx,color);}
    else{ctx.globalCompositeOperation="source-over";ctx.fillStyle=color;}
    ctx.beginPath();ctx.arc(pos.x,pos.y,brushSize/2,0,Math.PI*2);ctx.fill();ctx.restore();
    composite();
  };

  const draw=(e)=>{
    if(!isDown.current)return;
    const pos=getPos(e);
    if(tool==="move"){const dx=pos.x-moveData.current.start.x,dy=pos.y-moveData.current.start.y;const c=activeCanvas();const ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);ctx.putImageData(moveData.current.data,Math.round(dx),Math.round(dy));composite();return;}
    if(tool==="select"){
      if(selMode.current==="new"){const x=Math.min(pos.x,startPos.current.x),y=Math.min(pos.y,startPos.current.y),w=Math.abs(pos.x-startPos.current.x),h=Math.abs(pos.y-startPos.current.y);setSelRect({x,y,w,h});}
      else if(selMode.current==="move"){lastPos.current=pos;const dx=pos.x-selData.current.start.x,dy=pos.y-selData.current.start.y;const r=selData.current.rect;const ctx=activeCtx();ctx.putImageData(selData.current.base,0,0);ctx.save();ctx.globalCompositeOperation="source-over";ctx.globalAlpha=1;ctx.drawImage(selData.current.regionCanvas,Math.round(r.x+dx),Math.round(r.y+dy));ctx.restore();setSelRect({x:r.x+dx,y:r.y+dy,w:r.w,h:r.h});}
      return;
    }
    if(tool==="rect"){const x=Math.min(pos.x,startPos.current.x),y=Math.min(pos.y,startPos.current.y),w=Math.abs(pos.x-startPos.current.x),h=Math.abs(pos.y-startPos.current.y);pendingRect.current={x,y,w,h};composite();const ctx=displayRef.current.getContext("2d");ctx.save();ctx.globalAlpha=0.9;ctx.fillStyle=color;ctx.fillRect(x,y,w,h);ctx.restore();return;}
    const ctx=activeCtx();if(!ctx)return;ctx.save();ctx.lineCap="round";ctx.lineJoin="round";ctx.lineWidth=brushSize;
    if(tool==="eraser"){ctx.globalCompositeOperation="destination-out";ctx.strokeStyle="rgba(0,0,0,1)";}
    else if(tool==="pattern"){ctx.globalCompositeOperation="source-over";ctx.strokeStyle=makeDotPattern(ctx,color);}
    else{ctx.globalCompositeOperation="source-over";ctx.strokeStyle=color;}
    ctx.beginPath();ctx.moveTo(lastPos.current.x,lastPos.current.y);ctx.lineTo(pos.x,pos.y);ctx.stroke();ctx.restore();
    lastPos.current=pos;composite();
  };

  const endDraw=()=>{
    if(!isDown.current)return;
    isDown.current=false;
    if(tool==="rect"){if(pendingRect.current){const r=pendingRect.current;if(r.w>1&&r.h>1){const ctx=activeCtx();if(ctx){ctx.save();ctx.globalCompositeOperation="source-over";ctx.fillStyle=color;ctx.fillRect(r.x,r.y,r.w,r.h);ctx.restore();}}pendingRect.current=null;}composite();updateThumbs();return;}
    if(tool==="move"){moveData.current=null;updateThumbs();return;}
    if(tool==="select"){
      if(selMode.current==="new"){const sr=selRectRef.current;if(sr&&sr.w<4&&sr.h<4)setSelRect(null);}
      else if(selMode.current==="move"){selData.current=null;updateThumbs();}
      selMode.current=null;composite();return;
    }
    updateThumbs();
  };

  const deleteSelection=()=>{if(!selRect)return;const ctx=activeCtx();if(ctx)ctx.clearRect(selRect.x,selRect.y,selRect.w,selRect.h);setSelRect(null);composite();updateThumbs();};
  const clearActive=()=>{pushUndo();const c=activeCanvas();if(c)c.getContext("2d").clearRect(0,0,c.width,c.height);composite();updateThumbs();};
  const selectTool=(id)=>{setTool(id);if(id!=="select")setSelRect(null);};

  const setLayerProp=(id,patch)=>setLayers(ls=>ls.map(l=>l.id===id?{...l,...patch}:l));
  const addLayer=()=>{if(layers.length>=MAX_LAYERS){setMsg({t:`레이어는 최대 ${MAX_LAYERS}개`,bad:true});return;}const id=nid();setLayers(ls=>[{id,name:`레이어 ${id}`,visible:true,opacity:1,blend:"source-over",thumb:null},...ls]);setActiveId(id);};
  const deleteLayer=(id)=>{if(layers.length<=1){setMsg({t:"마지막 레이어는 삭제할 수 없어요",bad:true});return;}delete canvasesRef.current[id];const rest=layers.filter(l=>l.id!==id);setLayers(rest);if(activeId===id)setActiveId(rest[0].id);};
  const moveLayer=(id,dir)=>{setLayers(ls=>{const i=ls.findIndex(l=>l.id===id);const j=i+dir;if(j<0||j>=ls.length)return ls;const nl=[...ls];[nl[i],nl[j]]=[nl[j],nl[i]];return nl;});};
  const mergeDown=(id)=>{const i=layers.findIndex(l=>l.id===id);if(i<0||i>=layers.length-1){setMsg({t:"아래에 합칠 레이어가 없어요",bad:true});return;}const upper=layers[i],lower=layers[i+1];const uc=canvasesRef.current[upper.id],lc=canvasesRef.current[lower.id];if(uc&&lc){const ctx=lc.getContext("2d");ctx.save();ctx.globalAlpha=upper.opacity;ctx.globalCompositeOperation=upper.blend;ctx.drawImage(uc,0,0);ctx.restore();}delete canvasesRef.current[upper.id];setLayers(ls=>ls.filter(l=>l.id!==upper.id));if(activeId===upper.id)setActiveId(lower.id);setTimeout(updateThumbs,0);};

  const changeRatio=(rid)=>{if(rid===ratioId)return;canvasesRef.current={};idRef.current=2;undoRef.current=[];setSelRect(null);setLayers([{id:1,name:"레이어 1",visible:true,opacity:1,blend:"source-over",thumb:null}]);setActiveId(1);setRatioId(rid);};

  const flatten=()=>{const buf=stackToBuffer();const out=document.createElement("canvas");out.width=csz.w;out.height=csz.h;const ctx=out.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,csz.w,csz.h);ctx.drawImage(buf,0,0);return out.toDataURL("image/png");};
  const complete=()=>onComplete(flatten());

  const persist=(arr)=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(arr));setSaves(arr);return true;}catch(e){setMsg({t:"저장 공간이 부족해요. 오래된 세이브를 지워주세요",bad:true});return false;}};
  const saveFile=()=>{
    if(saves.length>=MAX_SAVES){setMsg({t:`세이브는 최대 ${MAX_SAVES}개예요`,bad:true});return;}
    const layerData=layersRef.current.map(l=>({name:l.name,visible:l.visible,opacity:l.opacity,blend:l.blend,data:canvasesRef.current[l.id]?canvasesRef.current[l.id].toDataURL("image/png"):null}));
    const rec={id:Date.now(),name:`${goodsType.name} #${saves.length+1}`,ratioId,w:csz.w,h:csz.h,layers:layerData,thumb:flatten(),ts:new Date().toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})};
    if(persist([rec,...saves]))setMsg({t:"💾 저장 완료!",bad:false});
  };
  const deleteSave=(id)=>persist(saves.filter(s=>s.id!==id));
  const loadSave=(rec)=>{
    canvasesRef.current={};
    const newLayers=rec.layers.map(l=>{const id=nid();const c=document.createElement("canvas");c.width=rec.w;c.height=rec.h;canvasesRef.current[id]=c;if(l.data){const img=new Image();img.onload=()=>{c.getContext("2d").drawImage(img,0,0);composite();updateThumbs();};img.src=l.data;}return{id,name:l.name,visible:l.visible,opacity:l.opacity,blend:l.blend,thumb:null};});
    layersRef.current=newLayers;
    setRatioId(rec.ratioId);setLayers(newLayers);setActiveId(newLayers[0]?newLayers[0].id:1);setSelRect(null);undoRef.current=[];setShowSaves(false);setMsg({t:"📂 불러왔어요!",bad:false});
  };

  return(<div style={{display:"flex",flexDirection:"column",height:"100%",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif",overflow:"hidden",touchAction:"none",position:"relative"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"6px",padding:"7px 10px",borderBottom:"1px solid #2a2a4a",background:"#12122a",flexShrink:0}}>
      <div style={{fontSize:"12px",fontWeight:"700",color:"#c084fc",whiteSpace:"nowrap"}}>✦ {goodsType.name}</div>
      <div style={{display:"flex",gap:"3px",overflow:"auto"}}>{DRAW_RATIOS.map(r=><button key={r.id} onClick={()=>changeRatio(r.id)} style={{padding:"3px 6px",fontSize:"10px",background:ratioId===r.id?"#7c3aed":"#1e1e3a",color:ratioId===r.id?"#fff":"#888",border:"none",borderRadius:"4px",cursor:"pointer",flexShrink:0}}>{r.id}</button>)}</div>
      <button onClick={()=>setShowLayers(v=>!v)} style={{padding:"4px 8px",fontSize:"11px",background:showLayers?"#7c3aed":"#1e1e3a",color:showLayers?"#fff":"#aaa",border:"none",borderRadius:"5px",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>📚 {layers.length}</button>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"5px 10px",background:"#0f0f24",borderBottom:"1px solid #2a2a4a",flexShrink:0}}>
      <span style={{fontSize:"10px",color:"#888",whiteSpace:"nowrap",minWidth:"58px"}}>크기 {brushSize}px</span>
      <input type="range" min="1" max="512" value={brushSize} onChange={e=>setBrushSize(Number(e.target.value))} style={{flex:1,accentColor:"#c084fc"}}/>
    </div>
    {msg&&<div style={{position:"absolute",top:"78px",left:"50%",transform:"translateX(-50%)",zIndex:400,padding:"7px 14px",borderRadius:"8px",fontSize:"12px",background:msg.bad?"#2a0a0a":"#0a2a1a",border:`1px solid ${msg.bad?"#e94560":"#06d6a0"}`,color:msg.bad?"#e94560":"#06d6a0",whiteSpace:"nowrap",pointerEvents:"none"}}>{msg.t}</div>}
    <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0}}>
      <div style={{width:"48px",background:"#12122a",borderRight:"1px solid #2a2a4a",display:"flex",flexDirection:"column",alignItems:"center",padding:"6px 0",gap:"4px",flexShrink:0,overflow:"auto"}}>
        {TOOLS.map(t=><button key={t.id} title={t.name} onClick={()=>selectTool(t.id)} style={{width:"36px",height:"34px",borderRadius:"8px",background:tool===t.id?"#7c3aed":"transparent",border:`1px solid ${tool===t.id?"#a855f7":"#2a2a4a"}`,fontSize:"15px",cursor:"pointer",flexShrink:0}}>{t.icon}</button>)}
        <div style={{width:"28px",height:"1px",background:"#2a2a4a",margin:"2px 0"}}/>
        <button title="실행취소" onClick={undo} style={{width:"36px",height:"30px",background:"transparent",border:"1px solid #2a2a4a",color:"#888",borderRadius:"6px",cursor:"pointer",fontSize:"13px",flexShrink:0}}>↩</button>
        <button title="현재 레이어 비우기" onClick={clearActive} style={{width:"36px",height:"30px",background:"transparent",border:"1px solid #2a2a4a",color:"#888",borderRadius:"6px",cursor:"pointer",fontSize:"8px",lineHeight:1.2,flexShrink:0}}>전체<br/>삭제</button>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"#0a0a18",overflow:"hidden",touchAction:"none",position:"relative"}}>
        <canvas ref={displayRef} width={csz.w} height={csz.h} style={{display:"block",maxWidth:"calc(100% - 8px)",maxHeight:"calc(100% - 8px)",cursor:tool==="eyedropper"?"copy":tool==="move"?"move":"crosshair",boxShadow:"0 0 24px rgba(124,58,237,0.25)",border:"1px solid #3a2a6a",touchAction:"none",background:"#fff"}} onPointerDown={e=>{try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_){}startDraw(e);}} onPointerMove={draw} onPointerUp={e=>{try{e.currentTarget.releasePointerCapture(e.pointerId);}catch(_){}endDraw();}} onPointerCancel={endDraw}/>
        {tool==="select"&&selRect&&selRect.w>4&&<button onClick={deleteSelection} style={{position:"absolute",bottom:"8px",left:"50%",transform:"translateX(-50%)",padding:"6px 14px",background:"#e94560",border:"none",color:"#fff",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:"700",zIndex:50}}>선택영역 삭제 🗑</button>}
      </div>
      <div style={{width:"46px",background:"#12122a",borderLeft:"1px solid #2a2a4a",display:"flex",flexDirection:"column",alignItems:"center",padding:"6px 4px",gap:"4px",flexShrink:0,overflow:"auto"}}>
        <button onClick={()=>setShowPicker(p=>!p)} style={{width:"34px",height:"34px",borderRadius:"8px",background:color,border:`2px solid ${showPicker?"#fff":"#7c3aed"}`,cursor:"pointer",boxShadow:`0 0 8px ${color}88`,flexShrink:0}}/>
        <div style={{fontSize:"7px",color:"#555"}}>최근색</div>
        {recentColors.map((c,i)=><div key={i} onClick={()=>pickColor(c)} title={i===0?"가장 최근 색":""} style={{width:"30px",height:"30px",borderRadius:"6px",background:c,cursor:"pointer",border:i===0?"2px solid #ffd166":color===c?"2px solid #fff":"1px solid #2a2a4a",boxShadow:i===0?"0 0 6px #ffd16688":"none",flexShrink:0}}/>)}
      </div>
    </div>
    {showPicker&&<div style={{position:"absolute",zIndex:200,right:"50px",top:"80px",background:"#12122a",border:"1px solid #3a3a6a",borderRadius:"12px",overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.7)",width:"236px"}}><ColorPicker color={color} onChange={c=>{setColor(c);setRecentColors(p=>[c,...p.filter(x=>x!==c)].slice(0,6));}}/><button onClick={()=>setShowPicker(false)} style={{width:"100%",padding:"7px",background:"#7c3aed",border:"none",color:"#fff",fontWeight:"700",cursor:"pointer",fontSize:"13px"}}>확인</button></div>}
    {showLayers&&<LayerPanel layers={layers} activeId={activeId} onSelect={setActiveId} onProp={setLayerProp} onAdd={addLayer} onDelete={deleteLayer} onMove={moveLayer} onMerge={mergeDown} onClose={()=>setShowLayers(false)} max={MAX_LAYERS}/>}
    {showSaves&&<SaveListModal saves={saves} onLoad={loadSave} onDelete={deleteSave} onClose={()=>setShowSaves(false)} max={MAX_SAVES}/>}
    <div style={{display:"flex",gap:"6px",padding:"8px 10px",background:"#12122a",borderTop:"1px solid #2a2a4a",flexShrink:0}}>
      <button onClick={onCancel} style={{flex:1,padding:"9px 4px",background:"transparent",border:"1px solid #3a2a6a",color:"#888",borderRadius:"8px",cursor:"pointer",fontSize:"12px"}}>삭제</button>
      <button onClick={saveFile} style={{flex:1,padding:"9px 4px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#c084fc",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>💾 세이브</button>
      <button onClick={()=>setShowSaves(true)} style={{flex:1,padding:"9px 4px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#4cc9f0",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>📂 불러오기</button>
      <button onClick={complete} style={{flex:1.6,padding:"9px 4px",background:"linear-gradient(135deg,#7c3aed,#e94560)",border:"none",color:"#fff",fontWeight:"700",borderRadius:"8px",cursor:"pointer",fontSize:"12px",boxShadow:"0 4px 20px rgba(124,58,237,0.4)"}}>✦ 완료</button>
    </div>
  </div>);
}
