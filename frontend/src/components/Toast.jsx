import { useEffect } from "react";

const toastStyles = {
    success: "bg-emerald-600",
    error: "bg-rose-600",
    info: "bg-slate-700",
};

export default function Toast({ message, type = "success", onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            if (onClose) {
                onClose();
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    if (!message) return null;

    return (
        <div
            className={`fixed bottom-4 right-4 z-50 animate-fade-in-up rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toastStyles[type] || toastStyles.success}`}
            style={{
                animation: "fadeInUp 0.3s ease-out",
            }}
        >
            <style>
                {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes fadeOut {
            from {
              opacity: 1;
              transform: translateY(0);
            }
            to {
              opacity: 0;
              transform: translateY(10px);
            }
          }
          .animate-fade-in-up {
            animation: fadeInUp 0.3s ease-out;
          }
        `}
            </style>
            {type === "success" && "✓ "}
            {type === "error" && "✕ "}
            {type === "info" && "ℹ "}
            {message}
        </div>
    );
}
