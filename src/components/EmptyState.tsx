import { Sparkles } from "lucide-react";

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <span><Sparkles size={22} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
