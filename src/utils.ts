export function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function percent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

// 输入法组词期间 naive-ui 不更新 v-model（handleInput 里 isComposing 直接 return），
// 组词未上屏就点按钮时：第一次点击只起到"让输入法上屏"的作用（此时按钮可能仍因旧值禁用），
// 点击本身被吞掉，要点两次。绑定在提交/发送按钮的 @mousedown 上，按下即让输入框失焦、
// 强制组词上屏同步 v-model，随后的 click 就能读到完整答案。
export function commitComposingInput(): void {
  const el = document.activeElement;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.blur();
}

function moveHomeEndCaret(e: KeyboardEvent): void {
  if (e.key !== "Home" && e.key !== "End") return;
  if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
  const el = e.target;
  if (!(el instanceof HTMLTextAreaElement) && !(el instanceof HTMLInputElement)) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  if (start === null || end === null) return;
  e.preventDefault();
  const active = el.selectionDirection === "backward" ? start : end;
  const value = el.value;
  let next: number;
  if (e.key === "Home") {
    next = value.lastIndexOf("\n", active - 1) + 1;
  } else {
    const nl = value.indexOf("\n", active);
    next = nl === -1 ? value.length : nl;
  }
  if (e.shiftKey) {
    const anchor = el.selectionDirection === "backward" ? end : start;
    el.setSelectionRange(
      Math.min(anchor, next),
      Math.max(anchor, next),
      next < anchor ? "backward" : "forward",
    );
  } else {
    el.setSelectionRange(next, next);
  }
}

export function installHomeEndKeys(): void {
  window.addEventListener("keydown", moveHomeEndCaret);
}
