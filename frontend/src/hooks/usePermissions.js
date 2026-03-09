import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const DEFAULT_AUTH0_SCOPE =
    "openid profile email offline_access name read:agents create:agents update:agents delete:agents rotate:secret revoke:agent read:audit admin";

export function decodeJwtPermissions(token) {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        const payload = JSON.parse(jsonPayload);
        const permissions = payload.permissions || [];

        // Auth0 scopes are space separated
        const scopeStr = payload.scope || "";
        const scopes = scopeStr.split(" ").filter(Boolean);

        // Merge into a single array
        const allScopes = Array.from(new Set([...permissions, ...scopes]));
        return allScopes;
    } catch (error) {
        console.error("Failed to decode token", error);
        return [];
    }
}

export function usePermissions(devBypassAuth, authConfig = null) {
    const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();
    const [permissions, setPermissions] = useState([]);
    const [loadingPermissions, setLoadingPermissions] = useState(true);

    useEffect(() => {
        async function loadPermissions() {
            if (devBypassAuth) {
                setPermissions([
                    "admin:system",
                    "read:agents",
                    "create:agents",
                    "update:agents",
                    "delete:agents",
                    "rotate:secret",
                    "revoke:agent",
                    "read:audit"
                ]);
                setLoadingPermissions(false);
                return;
            }

            if (!isLoading && isAuthenticated) {
                try {
                    const token = await getAccessTokenSilently({
                        authorizationParams: {
                            audience: authConfig?.audience || import.meta.env.VITE_AUTH0_AUDIENCE,
                            scope: authConfig?.scope || import.meta.env.VITE_AUTH0_SCOPE || DEFAULT_AUTH0_SCOPE,
                        },
                    });
                    const decoded = decodeJwtPermissions(token);
                    setPermissions(decoded);
                } catch (error) {
                    console.error("Error fetching permissions for UI:", error);
                    setPermissions([]);
                } finally {
                    setLoadingPermissions(false);
                }
            } else if (!isLoading && !isAuthenticated) {
                setPermissions([]);
                setLoadingPermissions(false);
            }
        }

        loadPermissions();
    }, [getAccessTokenSilently, isAuthenticated, isLoading, devBypassAuth, authConfig]);

    // Expose boolean helper flags based on the enterprise RBAC dictionary
    const isAdmin = permissions.some(p => p.startsWith("admin:"));

    return {
        permissions,
        loadingPermissions,
        isAdmin,
        canReadAgents: isAdmin || permissions.includes("read:agents"),
        canCreateAgents: isAdmin || permissions.includes("create:agents"),
        canUpdateAgents: isAdmin || permissions.includes("update:agents"),
        canDeleteAgents: isAdmin || permissions.includes("delete:agents"),
        canRotateSecret: isAdmin || permissions.includes("rotate:secret"),
        canRevokeAgent: isAdmin || permissions.includes("revoke:agent"),
        canReadAudit: isAdmin || permissions.includes("read:audit"),
    };
}
