export interface StepResult {
  ok: boolean;
  state?: "completed" | "failed" | "pending";
}
export function lotPresentation(steps: StepResult[], verified: boolean, loading: boolean, failed: boolean, animated: boolean, revealed: number) {
  const successful = verified && !loading && !failed && steps.length === 4 && steps.every(step => step.ok && (!step.state || step.state === "completed"));
  const visible = Math.max(0, Math.min(4, Math.floor(revealed)));
  const animating = successful && animated && visible < 4;
  return {
    successful,
    animating,
    ready: successful && !animating,
    completed: animating ? visible : steps.filter(step => step.ok && (!step.state || step.state === "completed")).length,
    states: steps.map((step, index) => animating
      ? index < visible ? "completed" : index === visible ? "active" : "pending"
      : step.state ?? (step.ok ? "completed" : "failed")),
  };
}
