import {
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "danger", // "danger" | "warning" | "info"
}) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            button: "bg-rose-600 hover:bg-rose-700 text-white",
            icon: "text-rose-600",
            border: "border-rose-200",
        },
        warning: {
            button: "bg-amber-500 hover:bg-amber-600 text-white",
            icon: "text-amber-600",
            border: "border-amber-200",
        },
        info: {
            button: "bg-blue-600 hover:bg-blue-700 text-white",
            icon: "text-blue-600",
            border: "border-blue-200",
        },
    };

    const styles = variantStyles[variant] || variantStyles.danger;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative mx-4 w-full max-w-md transform rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all">
                {/* Icon */}
                <div className="mb-4 flex items-center justify-center">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 ${styles.icon}`}>
                        <ExclamationTriangleIcon className="h-6 w-6" />
                    </div>
                </div>

                {/* Content */}
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{message}</p>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${styles.button}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
