import { useEffect, useRef, useState } from "react";

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded || {};
  } catch (_) {
    return {};
  }
}

export default function LoginGate({ onLogin }) {
  const buttonRef = useRef(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    let retry;
    const hasClient = Boolean(clientId);
    function init() {
      const google = window.google?.accounts?.id;
      if (!google) {
        retry = setTimeout(init, 300);
        return;
      }
      if (!hasClient) {
        setError("Set VITE_GOOGLE_CLIENT_ID in .env");
        return;
      }

      google.initialize({
        client_id: clientId,
        callback: (response) => {
          const data = decodeJwtPayload(response.credential);
          onLogin({
            name: data.name || "Google user",
            email: data.email,
            token: response.credential,
          });
        },
        ux_mode: "popup",
      });

      if (buttonRef.current) {
        google.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          width: 320,
        });
        setReady(true);
      }
    }

    init();
    return () => clearTimeout(retry);
  }, [clientId, onLogin]);

  return (
    <div className="login">
      <div ref={buttonRef} />
      {!ready && !error ? (
        <p className="muted">Loading Google sign-in...</p>
      ) : null}
      {error ? <p className="status error">{error}</p> : null}
    </div>
  );
}
