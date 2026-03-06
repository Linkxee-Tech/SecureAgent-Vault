import { useState } from "react";
import {
    KeyIcon,
    ClipboardDocumentIcon,
    CheckCircleIcon,
    EyeIcon,
    EyeSlashIcon,
} from "@heroicons/react/24/outline";

export default function ApiKeyModal({
    isOpen,
    onClose,
    onSubmit,
    agentName = "",
    title = "Store API Key",
    submitLabel = "Store Securely",
}) {
    const [secretName, setSecretName] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [showKey, setShowKey] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!secretName.trim() || !apiKey.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(secretName.trim(), apiKey.trim());
            handleClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setSecretName("");
        setApiKey("");
        setShowKey(false);
        setCopied(false);
        onClose();
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative mx-4 w-full max-w-md transform rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                        <KeyIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                        {agentName && (
                            <p className="text-sm text-slate-500">for {agentName}</p>
                        )}
                    </div>
                </div>

                {/* Warning */}
                <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <p className="text-xs text-amber-800">
                        <span className="font-semibold">🔒 Secure Storage:</span> Your API key will be encrypted with AES-256-GCM before storage.
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    {/* Secret Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Secret Name
                        </label>
                        <input
                            type="text"
                            value={secretName}
                            onChange={(e) => setSecretName(e.target.value)}
                            placeholder="e.g., weatherapi, openai, slack"
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    {/* API Key */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            API Key
                        </label>
                        <div className="relative">
                            <input
                                type={showKey ? "text" : "password"}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Enter your API key"
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showKey ? (
                                    <EyeSlashIcon className="h-5 w-5" />
                                ) : (
                                    <EyeIcon className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                    <button
                        onClick={handleClose}
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!secretName.trim() || !apiKey.trim() || isSubmitting}
                        className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Storing...
                            </>
                        ) : (
                            <>
                                <KeyIcon className="h-4 w-4" />
                                {submitLabel}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Secret Reveal Modal for showing newly created secrets
export function SecretRevealModal({ isOpen, onClose, secret, title = "Agent Secret" }) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative mx-4 w-full max-w-lg transform rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                        <KeyIcon className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-amber-900">{title}</h3>
                        <p className="text-sm text-amber-700">Save this secret now</p>
                    </div>
                </div>

                {/* Warning */}
                <div className="mb-4 rounded-lg bg-amber-100 border border-amber-300 p-3">
                    <p className="text-sm text-amber-900">
                        <span className="font-semibold">⚠️ Important:</span> This secret will only be shown once. Copy it now and store it securely.
                    </p>
                </div>

                {/* Secret Display */}
                <div className="relative">
                    <code className="block w-full rounded-xl bg-white border border-amber-300 px-4 py-3 font-mono text-sm text-slate-900 break-all">
                        {secret}
                    </code>
                    <button
                        onClick={copyToClipboard}
                        className="absolute right-2 top-2 rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 transition-colors"
                        title="Copy to clipboard"
                    >
                        {copied ? (
                            <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                        ) : (
                            <ClipboardDocumentIcon className="h-5 w-5" />
                        )}
                    </button>
                </div>

                {/* Actions */}
                <div className="mt-6">
                    <button
                        onClick={onClose}
                        className="w-full rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
                    >
                        I've saved it, continue
                    </button>
                </div>
            </div>
        </div>
    );
}
