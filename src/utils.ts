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
