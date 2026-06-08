import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, eyebrow, children, wide }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.section
            className={`modal-sheet ${wide ? "modal-wide" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 48, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 36, scale: 0.98 }}
            transition={{ type: "spring", damping: 27, stiffness: 310 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                {eyebrow && <p className="eyebrow">{eyebrow}</p>}
                <h2>{title}</h2>
              </div>
              <button className="icon-button" onClick={onClose} aria-label={`Close ${title}`}>
                <X size={20} />
              </button>
            </div>
            {children}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
