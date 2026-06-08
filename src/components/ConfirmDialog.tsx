import { AlertTriangle } from "lucide-react";

export function ConfirmDialog({ title, text, confirmLabel, onConfirm, onCancel }: {
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="confirm-content">
      <span className="confirm-icon"><AlertTriangle size={24} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      <div className="form-actions"><button className="button secondary" onClick={onCancel}>Cancel</button><button className="button danger-button" onClick={onConfirm}>{confirmLabel}</button></div>
    </div>
  );
}
