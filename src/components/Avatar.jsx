import { SKINS, outfitOf, DEFAULT_AVATAR } from "../data/avatarData.js";

/* ============================================================
   아바타 렌더러 — SVG 치비 (정면). 슬롯 순서: 뒷머리 → 몸/의상 → 머리(헤어캡)
   → 얼굴 → 앞머리 디테일 → 액세서리. 파츠 id는 avatarData 규격.
   ============================================================ */

export default function Avatar({ avatar, style }) {
  const a = { ...DEFAULT_AVATAR, ...(avatar || {}) };
  const skin = (SKINS.find(s => s.id === a.skin) || SKINS[0]).c;
  const hc = a.hairColor || "#6b4a35";
  const o = outfitOf(a.outfit);
  const dress = a.outfit === "onepiece" || a.outfit === "maid" || a.outfit === "sailor";
  const shade = "rgba(0,0,0,0.14)";

  return (
    <svg viewBox="0 0 100 150" style={{ display: "block", height: "100%", ...style }}>
      {/* ── 뒷머리 (긴 스타일) ── */}
      {a.hair === "long" && <path d={`M22,40 Q18,95 26,104 L38,98 L36,60 M78,40 Q82,95 74,104 L62,98 L64,60`} fill={hc} />}
      {a.hair === "long" && <rect x="22" y="42" width="56" height="52" rx="16" fill={hc} />}
      {a.hair === "twin" && <g fill={hc}><circle cx="16" cy="52" r="9" /><path d="M16,52 Q10,82 18,94 L26,90 Q20,70 24,54 Z" /><circle cx="84" cy="52" r="9" /><path d="M84,52 Q90,82 82,94 L74,90 Q80,70 76,54 Z" /></g>}
      {a.hair === "pony" && <path d="M72,28 Q92,36 84,74 Q80,86 72,90 L68,80 Q78,62 68,40 Z" fill={hc} />}
      {/* ── 케이프(뒤) ── */}
      {a.outfit === "cape" && <path d="M30,74 L18,118 L82,118 L70,74 Z" fill={o.c} opacity="0.9" />}

      {/* ── 팔 ── */}
      <rect x="26.5" y="76" width="10" height="27" rx="5" fill={o.c} />
      <rect x="63.5" y="76" width="10" height="27" rx="5" fill={o.c} />
      <circle cx="31.5" cy="105" r="4" fill={skin} />
      <circle cx="68.5" cy="105" r="4" fill={skin} />

      {/* ── 다리/신발 ── */}
      {dress
        ? <g><rect x="41" y="106" width="6.5" height="20" rx="3" fill={skin} /><rect x="52.5" y="106" width="6.5" height="20" rx="3" fill={skin} /></g>
        : <g><rect x="40" y="104" width="8" height="23" rx="3.5" fill="#3a3348" /><rect x="52" y="104" width="8" height="23" rx="3.5" fill="#3a3348" /></g>}
      <ellipse cx="44" cy="129" rx="6.5" ry="3.5" fill="#2b2b38" />
      <ellipse cx="56" cy="129" rx="6.5" ry="3.5" fill="#2b2b38" />

      {/* ── 몸통/의상 ── */}
      {dress
        ? <path d="M36,74 L64,74 L70,112 L30,112 Z" fill={o.c} />
        : <rect x="35" y="72" width="30" height="36" rx="9" fill={o.c} />}
      {/* 의상 디테일 */}
      {a.outfit === "hoodie" && <g><path d="M38,72 Q50,82 62,72 L62,78 Q50,88 38,78 Z" fill={o.d} /><rect x="42" y="94" width="16" height="9" rx="4" fill={o.d} /><line x1="46" y1="80" x2="46" y2="90" stroke={o.d} strokeWidth="2" /><line x1="54" y1="80" x2="54" y2="90" stroke={o.d} strokeWidth="2" /></g>}
      {a.outfit === "tshirt" && <path d={`M50,84 l2.4,4.8 5.3,.8 -3.8,3.7 .9,5.2 -4.8,-2.5 -4.8,2.5 .9,-5.2 -3.8,-3.7 5.3,-.8 Z`} fill={o.d} />}
      {a.outfit === "track" && <g stroke={o.d} strokeWidth="2.5"><line x1="28" y1="78" x2="28" y2="100" /><line x1="72" y1="78" x2="72" y2="100" /><line x1="50" y1="72" x2="50" y2="108" /></g>}
      {a.outfit === "knit" && <g stroke={o.d} strokeWidth="1.6" opacity="0.8">{[78, 84, 90, 96, 102].map(y => <line key={y} x1="36" y1={y} x2="64" y2={y} />)}</g>}
      {a.outfit === "sailor" && <g><path d="M38,74 L50,88 L62,74 L62,82 L50,94 L38,82 Z" fill={o.d} /><path d="M46,74 L50,88 L54,74 Z" fill="#c0455a" /></g>}
      {a.outfit === "onepiece" && <g fill={o.d}><circle cx="50" cy="80" r="2" /><circle cx="50" cy="88" r="2" /><path d="M32,104 L68,104 L70,112 L30,112 Z" /></g>}
      {a.outfit === "suit" && <g><path d="M43,72 L50,86 L57,72 L57,76 L50,92 L43,76 Z" fill={o.d} /><path d="M48.6,86 L51.4,86 L50.7,98 L49.3,98 Z" fill="#c0455a" /></g>}
      {a.outfit === "maid" && <g fill={o.d}><path d="M40,86 L60,86 L64,110 L36,110 Z" /><circle cx="50" cy="80" r="1.8" /><path d="M36,74 Q50,84 64,74 L64,77 Q50,87 36,77 Z" /></g>}
      {a.outfit === "parka" && <g><path d="M36,70 Q50,84 64,70 L64,80 Q50,92 36,80 Z" fill={o.d} /><line x1="50" y1="84" x2="50" y2="106" stroke={o.d} strokeWidth="2.5" /></g>}
      {a.outfit === "cape" && <g><circle cx="50" cy="76" r="3" fill={o.d} /><path d={`M50,88 l2,4 4.4,.6 -3.2,3.1 .8,4.3 -4,-2.1 -4,2.1 .8,-4.3 -3.2,-3.1 4.4,-.6 Z`} fill={o.d} /></g>}

      {/* ── 머리 (헤어캡 → 얼굴) ── */}
      <circle cx="50" cy="43" r="27.5" fill={hc} />
      <circle cx="50" cy="49.5" r="21.5" fill={skin} />
      {/* 앞머리 디테일 */}
      {a.hair === "bob" && <g fill={hc}><path d="M27,46 Q26,62 32,66 L36,52 Z" /><path d="M73,46 Q74,62 68,66 L64,52 Z" /></g>}
      {a.hair === "short" && <path d="M31,38 Q40,30 50,32 Q62,28 69,38 L66,44 Q56,36 48,40 Q38,38 34,44 Z" fill={hc} opacity="0.55" />}
      {a.hair === "curly" && <g fill={hc}>{[30, 39, 50, 61, 70].map((x, i) => <circle key={x} cx={x} cy={i % 2 ? 30 : 35} r="7.5" />)}</g>}
      {a.hair === "pony" && <circle cx="71" cy="27" r="6" fill={hc} />}
      <path d="M30,42 Q36,32 50,33 Q64,32 70,42 L70,36 Q60,24 50,25 Q40,24 30,36 Z" fill={hc} />

      {/* ── 얼굴 ── */}
      <circle cx="41.5" cy="52" r="2.6" fill="#33303e" />
      <circle cx="58.5" cy="52" r="2.6" fill="#33303e" />
      <circle cx="42.4" cy="51.2" r="0.8" fill="#fff" />
      <circle cx="59.4" cy="51.2" r="0.8" fill="#fff" />
      <ellipse cx="37" cy="58" rx="3.4" ry="1.9" fill="#ffb3ba" opacity="0.55" />
      <ellipse cx="63" cy="58" rx="3.4" ry="1.9" fill="#ffb3ba" opacity="0.55" />
      {a.acc !== "mask" && <path d="M46.5,60.5 Q50,63.5 53.5,60.5" stroke="#a86a6a" strokeWidth="1.7" fill="none" strokeLinecap="round" />}

      {/* ── 액세서리 ── */}
      {a.acc === "catears" && <g fill="#8a6a4a"><path d="M28,26 L34,10 L42,22 Z" /><path d="M72,26 L66,10 L58,22 Z" /><path d="M31,23 L34.5,14 L39,21 Z" fill="#e8b4c8" /><path d="M69,23 L65.5,14 L61,21 Z" fill="#e8b4c8" /></g>}
      {a.acc === "ribbon" && <g fill="#e94560"><path d="M60,18 Q52,22 60,26 Q56,22 60,18" /><path d="M60,22 L48,14 L52,24 Z" /><path d="M60,22 L74,16 L70,28 Z" /><circle cx="60" cy="22" r="3.4" fill="#c0304a" /></g>}
      {a.acc === "glasses" && <g stroke="#3a3340" strokeWidth="1.8" fill="rgba(255,255,255,0.14)"><circle cx="41.5" cy="52" r="6.5" /><circle cx="58.5" cy="52" r="6.5" /><line x1="48" y1="52" x2="52" y2="52" /></g>}
      {a.acc === "headset" && <g><path d="M27,42 Q28,18 50,17 Q72,18 73,42" stroke="#4a4a5e" strokeWidth="4" fill="none" /><rect x="22" y="40" width="9" height="14" rx="4" fill="#4a4a5e" /><rect x="69" y="40" width="9" height="14" rx="4" fill="#4a4a5e" /></g>}
      {a.acc === "beret" && <g><ellipse cx="44" cy="23" rx="17" ry="8.5" fill="#c0455a" transform="rotate(-8 44 23)" /><circle cx="44" cy="15" r="2" fill="#a83248" /></g>}
      {a.acc === "mask" && <g><path d="M38,55 Q50,52 62,55 L61,64 Q50,68 39,64 Z" fill="#f2f2f6" stroke="#d8d8de" strokeWidth="0.8" /><line x1="38.5" y1="56" x2="29" y2="50" stroke="#d8d8de" strokeWidth="1.4" /><line x1="61.5" y1="56" x2="71" y2="50" stroke="#d8d8de" strokeWidth="1.4" /></g>}
      {a.acc === "halo" && <ellipse cx="50" cy="10" rx="13" ry="4" fill="none" stroke="#ffd166" strokeWidth="3" style={{ filter: "drop-shadow(0 0 4px rgba(255,209,102,0.9))" }} />}
      {a.acc === "crown" && <g fill="#ffd166" stroke="#e0a93f" strokeWidth="0.8"><path d="M36,20 L38,8 L44,15 L50,5 L56,15 L62,8 L64,20 Z" /><circle cx="50" cy="4" r="2" /></g>}

      {/* 바닥 그림자 */}
      <ellipse cx="50" cy="132" rx="20" ry="3.5" fill={shade} />
    </svg>
  );
}
