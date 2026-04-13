import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRoleHomePath } from "../routes/portalPaths";
import { adminLogin, ApiError } from "../services/matrimonyApi";

function getApiErrorMessage(err) {
  if (err instanceof ApiError) {
    return err.message || "Admin login failed";
  }

  return err?.message || "Admin login failed";
}

function AdminLoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isSessionReady, user, setAuth } = useAuth();
  const [formState, setFormState] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    if (isAuthenticated && user?.role) {
      navigate(getRoleHomePath(user.role), {
        replace: true
      });
    }
  }, [isAuthenticated, isSessionReady, navigate, user?.role]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const authData = await adminLogin({
        email: formState.email.trim().toLowerCase(),
        password: formState.password
      });

      setAuth(authData);
      navigate(getRoleHomePath(authData.user?.role), { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_8%_10%,rgba(96,116,185,0.24),transparent_30%),radial-gradient(circle_at_88%_16%,rgba(243,176,124,0.2),transparent_32%),linear-gradient(180deg,#f5f8ff_0%,#fef7f2_100%)] px-5 py-10 text-[#1f2a44] lg:px-8">
      <main className="mx-auto max-w-xl">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-3xl border border-[#dce2f0] bg-white/90 p-8 shadow-xl shadow-[#1f2a44]/5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6d7390]">
            Admin Access
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
            Admin Login
          </h1>
          <p className="mt-3 text-sm text-[#56607a]">
            Use seeded admin credentials only. Admin accounts cannot be created from public
            signup.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.18em] text-[#7e6680]">
                Admin Email
              </span>
              <input
                type="email"
                required
                value={formState.email}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    email: event.target.value
                  }))
                }
                className="w-full rounded-xl border border-[#d7dced] bg-white px-4 py-3 text-sm outline-none focus:border-[#1f2a44]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.18em] text-[#7e6680]">
                Password
              </span>
              <input
                type="password"
                required
                value={formState.password}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    password: event.target.value
                  }))
                }
                className="w-full rounded-xl border border-[#d7dced] bg-white px-4 py-3 text-sm outline-none focus:border-[#1f2a44]"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#1f2a44] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2d3d63] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Signing in..." : "Login as Admin"}
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          <p className="mt-6 text-xs uppercase tracking-[0.16em] text-[#7b6a83]">
            Public user auth:{" "}
            <Link to="/login" className="font-semibold text-[#8a2918]">
              /login
            </Link>
          </p>
        </motion.section>
      </main>
    </div>
  );
}

export default AdminLoginPage;
