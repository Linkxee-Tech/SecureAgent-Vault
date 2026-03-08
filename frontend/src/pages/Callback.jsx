import { useAuth0 } from "@auth0/auth0-react";

export default function Callback() {
    const { isLoading } = useAuth0();

    if (isLoading) {
        return <div>Logging you in...</div>;
    }

    window.location.href = "/";
}