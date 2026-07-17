import { GOODS_TYPES } from "../data/gameData.js";

export function applyReadyOrders(s){
  const orders=s.orders||[];
  if(!orders.some(o=>o.status==="making"&&o.readyDay<=s.day))return s;
  let goods=[...s.goods];
  orders.forEach(o=>{
    if(!(o.status==="making"&&o.readyDay<=s.day))return;
    const op=o.options||{};
    const idx=goods.findIndex(g=>g.artworkId===o.artworkId&&g.type===o.goodsType&&(g.shape||"")===(op.shape||"")&&!!g.outlined===!!op.hasOutline);
    if(idx>=0){goods[idx]={...goods[idx],stock:goods[idx].stock+o.quantity};}
    else{const t=GOODS_TYPES.find(x=>x.id===o.goodsType)||{};goods.push({id:Date.now()+Math.random(),artworkId:o.artworkId,type:o.goodsType,name:t.name||o.goodsType,imageData:op.outlineImage||o.artworkSnapshot,baseImage:o.artworkSnapshot,price:op.price||t.basePrice||1000,cost:t.cost||0,stock:o.quantity,shape:op.shape,outlined:!!op.hasOutline});}
  });
  const newOrders=orders.map(o=>(o.status==="making"&&o.readyDay<=s.day)?{...o,status:"sold"}:o);
  return {...s,goods,orders:newOrders,flags:{...s.flags,recentGoodsRelease:true,mailOrderActive:goods.length>0}};
}
