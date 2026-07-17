import { Component } from "react";

// 렌더 오류가 나도 게임 전체가 죽지 않도록 화면 단위로 감싸는 공용 바운더리.
// key를 화면/앱 id로 주면 화면 전환 시 오류 상태가 자동 초기화된다.
export default class ErrorBoundary extends Component {
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(err){return {err};}
  componentDidCatch(err,info){console.error("[서코의신] 렌더 오류:",err,info);}
  render(){
    if(this.state.err)return(<div style={{padding:"24px",height:"100%",overflow:"auto",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
      <div style={{fontSize:"32px",marginBottom:"10px"}}>😵</div>
      <div style={{fontSize:"15px",fontWeight:"700",color:"#e94560",marginBottom:"8px"}}>화면 오류가 발생했어요</div>
      <div style={{fontSize:"12px",color:"#888",marginBottom:"12px",lineHeight:1.7}}>이 화면을 그리는 중 문제가 생겼어요. 아래 내용을 알려주시면 고칠 수 있어요.</div>
      <pre style={{fontSize:"11px",color:"#ffd166",background:"#1a1a3a",padding:"10px",borderRadius:"8px",whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{String(this.state.err&&this.state.err.stack||this.state.err)}</pre>
      <button onClick={()=>this.setState({err:null})} style={{marginTop:"12px",padding:"10px 18px",background:"linear-gradient(135deg,#7c3aed,#e94560)",border:"none",color:"#fff",fontWeight:"700",borderRadius:"10px",cursor:"pointer"}}>다시 시도</button>
    </div>);
    return this.props.children;
  }
}
