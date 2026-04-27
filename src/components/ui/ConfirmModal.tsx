import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDangerous = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} maxWidth="400px">
      <div className="confirm-modal-body">
        {isDangerous && (
          <div className="confirm-modal-icon">
            <AlertTriangle size={32} />
          </div>
        )}
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <Button variant="soft" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={isDangerous ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
