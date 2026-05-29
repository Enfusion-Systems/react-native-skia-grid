/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";

import { useRefCallback } from "./useRefCallback";

export type ModalStatePassThroughCallback<T = any> = (
  passthrough: T | null
) => void;

export type ModalStateClosePassThroughCallback<T = any, R = any> = (
  passthrough: T | null,
  closePassthrough: R | null
) => void;

type UseModalStateParams<T = any, R = any> = {
  defaultOpen?: boolean;
  beforeOpen?: ModalStatePassThroughCallback<T>;
  onOpen?: ModalStatePassThroughCallback<T>;
  beforeClose?: ModalStateClosePassThroughCallback<T, R>;
  onClose?: ModalStateClosePassThroughCallback<T, R>;
};

export type UseModalStateResults<T = any, R = any> = {
  open: boolean;
  toggleModal: VoidFunction;
  openModal: (passthrough?: T | null) => void;
  closeModal: (passthrough?: R | null) => void;
  openContentRef: React.MutableRefObject<T | null>;
};

export function useModalState<T = any, R = any>({
  defaultOpen = false,
  beforeOpen,
  onOpen,
  beforeClose,
  onClose,
}: UseModalStateParams<T, R> = {}): UseModalStateResults<T, R> {
  const [open, setOpen] = React.useState(defaultOpen);
  const openContentRef = React.useRef<T | null>(null);

  const openModal = useRefCallback(
    (passthrough: T | null = null) => {
      openContentRef.current = passthrough;
      beforeOpen?.(openContentRef.current);
      setOpen(true);
      onOpen?.(openContentRef.current);
    },
    [onOpen, beforeOpen]
  );
  const closeModal = useRefCallback(
    (passthrough: R | null = null) => {
      beforeClose?.(openContentRef.current, passthrough);
      setOpen(false);
      onClose?.(openContentRef.current, passthrough);
    },
    [onClose, beforeClose]
  );
  const toggleModal = useRefCallback(() => {
    if (open) closeModal();
    else openModal();
  }, [open]);

  return React.useMemo(
    () => ({ open, openModal, closeModal, toggleModal, openContentRef }),
    [open, openModal, closeModal, toggleModal, openContentRef]
  );
}
