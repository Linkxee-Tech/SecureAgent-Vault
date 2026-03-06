import React, { useState } from "react";
import {
    CodeBracketIcon,
    ClipboardIcon,
    ClipboardDocumentCheckIcon,
    DocumentTextIcon,
    CpuChipIcon,
    ServerIcon
} from "@heroicons/react/24/outline";

function CodeBlock({ language, code }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group rounded-xl bg-slate-900 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language}</span>
                <button
                    onClick={handleCopy}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                >
                    {copied ? <ClipboardDocumentCheckIcon className="h-4 w-4 text-emerald-400" /> : <ClipboardIcon className="h-4 w-4" />}
                </button>
            </div>
            <pre className="p-4 text-xs font-mono text-blue-300 overflow-x-auto custom-scrollbar leading-relaxed">
                {code}
            </pre>
        </div>
    );
}

export default function DeveloperPage() {
    const apiBase = window.location.origin + "/api/v1";

    const curlExample = `curl -X POST "${apiBase}/agents/{agent_id}/request-token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_secret": "your_agent_secret",
    "requested_scopes": ["read:weather"]
  }'`;

    const pythonExample = `import requests

def get_vault_token(agent_id, secret):
    url = f"${apiBase}/agents/{agent_id}/request-token"
    payload = {
        "agent_secret": secret,
        "requested_scopes": ["read:weather"]
    }
    response = requests.post(url, json=payload)
    response.raise_for_status()
    return response.json()["token"]

# Usage
token = get_vault_token("AGENT_UUID", "AGENT_SECRET")
print(f"Vault Token: {token}")`;

    const jsExample = `async function getVaultToken(agentId, secret) {
  const response = await fetch(\`${apiBase}/agents/\${agentId}/request-token\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_secret: secret,
      requested_scopes: ['read:weather']
    })
  });
  
  if (!response.ok) throw new Error('Auth failed');
  const data = await response.json();
  return data.token;
}`;

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
                <h2 className="text-lg font-semibold text-slate-900">Developer Integration</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Connect your AI agents to the SecureAgent Vault using our simplified REST API.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* API Docs */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                <ServerIcon className="h-5 w-5" />
                            </div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800">Authentication Flow</h3>
                        </div>

                        <div className="prose prose-slate prose-sm max-w-none">
                            <p>To access protected tools, your agent must first exchange its long-lived <strong>Agent Secret</strong> for a short-lived <strong>Vault Token</strong> (JWT).</p>
                            <ol className="list-decimal list-inside space-y-2 mt-4 text-slate-600">
                                <li>Register your agent in the <span className="font-semibold">Agents</span> tab.</li>
                                <li>Securely store the generated <span className="font-semibold">Agent Secret</span>.</li>
                                <li>Call the <code>/request-token</code> endpoint to get a 2-minute scoped JWT.</li>
                                <li>Use the JWT in the <code>Authorization: Bearer</code> header for tool calls.</li>
                            </ol>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                                <CodeBracketIcon className="h-5 w-5" />
                            </div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800">Implementation Examples</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                    Request Token (cURL)
                                </h4>
                                <CodeBlock language="bash" code={curlExample} />
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                    Python Integration
                                </h4>
                                <CodeBlock language="python" code={pythonExample} />
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                    JavaScript Integration
                                </h4>
                                <CodeBlock language="javascript" code={jsExample} />
                            </div>
                        </div>
                    </section>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                                <DocumentTextIcon className="h-5 w-5" />
                            </div>
                            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-widest">Base API URL</h3>
                        </div>
                        <code className="block w-full rounded-lg bg-white border border-blue-200 p-3 font-mono text-[11px] text-blue-700 mb-4 select-all">
                            {apiBase}
                        </code>
                        <p className="text-xs text-blue-800 leading-relaxed italic">
                            "All requests must use HTTPS and return JSON application/json content types."
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                                <CpuChipIcon className="h-5 w-5" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Tool Endpoints</h3>
                        </div>
                        <ul className="space-y-3">
                            <li className="flex items-center justify-between">
                                <span className="text-xs text-slate-600">Weather API</span>
                                <code className="text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border">/tools/weather</code>
                            </li>
                            <li className="flex items-center justify-between opacity-40">
                                <span className="text-xs text-slate-600">Search API</span>
                                <span className="text-[8px] font-bold uppercase text-slate-400 tracking-tighter">Coming Soon</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
