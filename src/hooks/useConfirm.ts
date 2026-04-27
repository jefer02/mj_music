import { useCallback, useRef, useState } from "react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve: (value: boolean) => void;
}

export interface UseConfirmResult {
  confirmState: ConfirmState | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export function useConfirm(): UseConfirmResult {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirmState({ ...options, isOpen: true, resolve });
    });
  }, []);

  const handleConfirm = useCallback((): void => {
    resolveRef.current?.(true);
    setConfirmState(null);
  }, []);

  const handleCancel = useCallback((): void => {
    resolveRef.current?.(false);
    setConfirmState(null);
  }, []);

  return { confirmState, confirm, handleConfirm, handleCancel };
}
