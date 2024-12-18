import { useEffect } from "react";
import { useToast } from "./toast";
export { ToastActionElement, type ToastProps } from "./toast";

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

export function useToastConfig() {
  const { toasts, removeToast } = useToast();

  useEffect(() => {
    const timeouts = new Set<ReturnType<typeof setTimeout>>();

    toasts.forEach((toast) => {
      if (toast.dismiss && toast.duration !== Infinity) {
        const timeout = setTimeout(() => {
          removeToast(toast.id);
        }, toast.duration || TOAST_REMOVE_DELAY);

        timeouts.add(timeout);
      }
    });

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [toasts, removeToast]);

  return {
    TOAST_LIMIT,
  };
}

export { useToast };
