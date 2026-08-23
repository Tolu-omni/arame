"use client";

import { useToast } from "@/frontend/context/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import styles from "./toast.module.css";

const icons = {
  success: <CheckCircle2 size={18} className={styles.successIcon} />,
  error: <AlertCircle size={18} className={styles.errorIcon} />,
  info: <Info size={18} className={styles.infoIcon} />,
  warning: <AlertTriangle size={18} className={styles.warningIcon} />,
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className={styles.container}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 15, transition: { duration: 0.2 } }}
            className={`${styles.toast} ${styles[toast.type]}`}
          >
            <div className={styles.icon}>{icons[toast.type]}</div>
            <div className={styles.message}>{toast.message}</div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
