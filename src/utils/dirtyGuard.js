// 미저장 작업 가드 — 그림 앱 등이 열려있는 동안 플래그를 세워두고,
// 창을 닫으려는 쪽(데스크톱 셸 등)이 확인 팝업을 띄울지 판단한다.
const flags = new Set();
export const setDirty = (key, on) => { if (on) flags.add(key); else flags.delete(key); };
export const isDirty = (key) => flags.has(key);
