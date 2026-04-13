import { createContext, useContext, useEffect, useState } from "react";
import { getAdminMe, getMe } from "../services/matrimonyApi";

const AUTH_STORAGE_KEY = "milap_auth_session_v1";

const AuthContext = createContext(null);

function readStoredSession() {
  if (typeof window === "undefined") {
    return {
      token: "",
      user: null
    };
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!raw) {
      return {
        token: "",
        user: null
      };
    }

    const parsed = JSON.parse(raw);

    if (!parsed?.token || !parsed?.user?.id || !parsed?.user?.role) {
      return {
        token: "",
        user: null
      };
    }

    return parsed;
  } catch (_error) {
    return {
      token: "",
      user: null
    };
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    if (!session?.token || !session?.user?.id) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    let mounted = true;

    async function validateStoredSession() {
      if (!session?.token || !session?.user?.id || !session?.user?.role) {
        if (mounted) {
          setIsSessionReady(true);
        }
        return;
      }

      try {
        const currentUser =
          session.user.role === "admin"
            ? await getAdminMe(session.token)
            : await getMe(session.token);

        if (!mounted) {
          return;
        }

        setSession((currentSession) => ({
          token: currentSession.token,
          user: {
            ...currentSession.user,
            ...currentUser,
            id: currentUser?.id || currentSession.user?.id
          }
        }));
      } catch (error) {
        if (!mounted) {
          return;
        }

        const statusCode = Number(error?.statusCode);
        const shouldClearSession = statusCode === 401 || statusCode === 403;

        if (shouldClearSession) {
          setSession({
            token: "",
            user: null
          });
        }
      } finally {
        if (mounted) {
          setIsSessionReady(true);
        }
      }
    }

    validateStoredSession();

    return () => {
      mounted = false;
    };
    // Run only on first load to validate persisted auth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleAuthInvalid(event) {
      const invalidToken = event?.detail?.token;

      setSession((currentSession) => {
        if (!currentSession?.token) {
          return currentSession;
        }

        if (invalidToken && currentSession.token !== invalidToken) {
          return currentSession;
        }

        return {
          token: "",
          user: null
        };
      });
      setIsSessionReady(true);
    }

    window.addEventListener("milap:auth-invalid", handleAuthInvalid);

    return () => {
      window.removeEventListener("milap:auth-invalid", handleAuthInvalid);
    };
  }, []);

  function setAuth(authData) {
    setSession({
      token: authData.token,
      user: authData.user
    });
    setIsSessionReady(true);
  }

  function clearAuth() {
    setSession({
      token: "",
      user: null
    });
    setIsSessionReady(true);
  }

  return (
    <AuthContext.Provider
      value={{
        token: session.token,
        user: session.user,
        isAuthenticated: Boolean(session.token && session.user?.id),
        isSessionReady,
        setAuth,
        clearAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
