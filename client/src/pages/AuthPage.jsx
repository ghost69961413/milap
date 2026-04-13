import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "../context/AuthContext";
import { ApiError, createProfile, login, signup } from "../services/matrimonyApi";
import { getRoleHomePath } from "../routes/portalPaths";
import { buildDefaultProfilePayload } from "../utils/profileTemplates";

const DEFAULT_SIGNUP_STATE = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  gender: "male",
  profileFor: "self",
  role: "normal_user"
};

const DEFAULT_LOGIN_STATE = {
  email: "",
  password: "",
  role: "normal_user"
};

const LOGIN_ROLE_OPTIONS = [
  { value: "normal_user", label: "Normal User" },
  { value: "consultant", label: "Consultant" },
  { value: "lawyer", label: "Lawyer" },
  { value: "decorator", label: "Decorator" }
];

const SIGNUP_ROLE_OPTIONS = [
  { value: "normal_user", label: "Normal User" },
  { value: "lawyer", label: "Lawyer" },
  { value: "decorator", label: "Decorator" }
];

function AuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isSessionReady, setAuth, user } = useAuth();
  const [mode, setMode] = useState("login");
  const [signupState, setSignupState] = useState(DEFAULT_SIGNUP_STATE);
  const [loginState, setLoginState] = useState(DEFAULT_LOGIN_STATE);
  const [error, setError] = useState("");
  const [errorList, setErrorList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    if (isAuthenticated && user?.role) {
      navigate(getRoleHomePath(user.role), { replace: true });
    }
  }, [isAuthenticated, isSessionReady, navigate, user?.role]);

  function normalizeIndianPhone(rawPhone) {
    const digits = String(rawPhone || "").replace(/\D/g, "");

    if (digits.length === 12 && digits.startsWith("91")) {
      return digits.slice(2);
    }

    return digits;
  }

  function getApiErrorMessages(err) {
    if (!(err instanceof ApiError)) {
      return [err?.message || "Something went wrong"];
    }

    const fieldErrors = err.details?.errors?.fieldErrors;

    if (fieldErrors && typeof fieldErrors === "object") {
      const flattened = Object.entries(fieldErrors).flatMap(([field, messages]) =>
        Array.isArray(messages)
          ? messages.filter(Boolean).map((message) => `${field}: ${message}`)
          : []
      );

      if (flattened.length) {
        return flattened;
      }
    }

    return [err.message || "Request failed"];
  }

  async function ensureProfileAfterSignup(token, user) {
    try {
      await createProfile(token, buildDefaultProfilePayload(user));
    } catch (err) {
      if (!(err instanceof ApiError) || err.statusCode !== 409) {
        throw err;
      }
    }
  }

  async function handleSignup(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setErrorList([]);

    try {
      const payload = {
        ...signupState,
        fullName: signupState.fullName.trim(),
        email: signupState.email.trim().toLowerCase(),
        phone: normalizeIndianPhone(signupState.phone)
      };

      const authData = await signup(payload);
      await ensureProfileAfterSignup(authData.token, authData.user);
      setAuth(authData);
      navigate(getRoleHomePath(authData.user?.role), { replace: true });
    } catch (err) {
      const messages = getApiErrorMessages(err);
      setError(messages[0] || "Unable to signup");
      setErrorList(messages.slice(1));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setErrorList([]);

    try {
      const authData = await login({
        email: loginState.email.trim().toLowerCase(),
        password: loginState.password,
        role: loginState.role
      });
      setAuth(authData);
      navigate(getRoleHomePath(authData.user?.role), { replace: true });
    } catch (err) {
      const messages = getApiErrorMessages(err);
      setError(messages[0] || "Unable to login");
      setErrorList(messages.slice(1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_17%_15%,rgba(245,168,124,0.22),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(120,150,206,0.2),transparent_28%),linear-gradient(180deg,#fffaf5_0%,#fffdfb_100%)] text-[#1f2a44]">
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-10 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.48fr_0.52fr]">
          <section className="rounded-[2rem] border border-[#eadccf] bg-white/75 p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8f6f58]">
              Live Auth
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-tight">
              Login as any user, send interest, then chat after acceptance.
            </h1>
            <p className="mt-4 text-sm leading-7 text-[#5d6782]">
              Use one account like <span className="font-semibold">user1</span> and another like{" "}
              <span className="font-semibold">riya</span>. Send interest from Discover.
              Once the receiver accepts, chat opens automatically in Chat page.
            </p>

            <div className="mt-6 rounded-2xl border border-[#e7d9cb] bg-[#fff7f0] p-4 text-sm text-[#4d576f]">
              <p className="font-semibold text-[#8a2918]">Your Journey Starts Here :</p>
              <p className="mt-2">
                1. Sign in and explore profiles in Discover.
              </p>
              <p>2. Send an interest to someone you like.</p>
              <p>3. Once accepted, start chatting instantly.</p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#eadccf] bg-white/85 p-7">
            <div className="mb-5 flex rounded-full border border-[#ead9cb] bg-[#fff8f2] p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={[
                  "w-1/2 rounded-full px-4 py-2 text-sm font-semibold transition",
                  mode === "login"
                    ? "bg-[#1f2a44] text-white"
                    : "text-[#56607a] hover:bg-[#f3ece5]"
                ].join(" ")}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={[
                  "w-1/2 rounded-full px-4 py-2 text-sm font-semibold transition",
                  mode === "signup"
                    ? "bg-[#1f2a44] text-white"
                    : "text-[#56607a] hover:bg-[#f3ece5]"
                ].join(" ")}
              >
                Signup
              </button>
            </div>

            {mode === "login" ? (
              <form className="space-y-4" onSubmit={handleLogin}>
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[#8f6f58]">
                    Email
                  </span>
                  <input
                    type="email"
                    required
                    value={loginState.email}
                    onChange={(event) =>
                      setLoginState((current) => ({
                        ...current,
                        email: event.target.value
                      }))
                    }
                    className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-3 text-sm outline-none focus:border-[#1f2a44]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[#8f6f58]">
                    Password
                  </span>
                  <input
                    type="password"
                    required
                    value={loginState.password}
                    onChange={(event) =>
                      setLoginState((current) => ({
                        ...current,
                        password: event.target.value
                      }))
                    }
                    className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-3 text-sm outline-none focus:border-[#1f2a44]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[#8f6f58]">
                    Login As
                  </span>
                  <select
                    value={loginState.role}
                    onChange={(event) =>
                      setLoginState((current) => ({
                        ...current,
                        role: event.target.value
                      }))
                    }
                    className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-3 text-sm outline-none focus:border-[#1f2a44]"
                  >
                    {LOGIN_ROLE_OPTIONS.map((roleOption) => (
                      <option key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#8a2918] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#a03825] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleSignup}>
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[#8f6f58]">
                    Full Name
                  </span>
                  <input
                    type="text"
                    required
                    value={signupState.fullName}
                    onChange={(event) =>
                      setSignupState((current) => ({
                        ...current,
                        fullName: event.target.value
                      }))
                    }
                    className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-3 text-sm outline-none focus:border-[#1f2a44]"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[#8f6f58]">
                      Email
                    </span>
                    <input
                      type="email"
                      required
                      value={signupState.email}
                      onChange={(event) =>
                        setSignupState((current) => ({
                          ...current,
                          email: event.target.value
                        }))
                      }
                      className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-3 text-sm outline-none focus:border-[#1f2a44]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[#8f6f58]">
                      Phone
                    </span>
                    <input
                      type="tel"
                      required
                      value={signupState.phone}
                      onChange={(event) =>
                        setSignupState((current) => ({
                          ...current,
                          phone: event.target.value
                        }))
                      }
                      className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-3 text-sm outline-none focus:border-[#1f2a44]"
                    />
                    <p className="mt-1 text-xs text-[#7f6b58]">
                      Use a 10-digit Indian number (you can also type with +91).
                    </p>
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[#8f6f58]">
                      Password
                    </span>
                    <input
                      type="password"
                      required
                      value={signupState.password}
                      onChange={(event) =>
                        setSignupState((current) => ({
                          ...current,
                          password: event.target.value
                        }))
                      }
                      className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-3 text-sm outline-none focus:border-[#1f2a44]"
                    />
                    <p className="mt-1 text-xs text-[#7f6b58]">
                      Minimum 8 chars with at least 1 letter and 1 number.
                    </p>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[#8f6f58]">
                      Gender
                    </span>
                    <select
                      value={signupState.gender}
                      onChange={(event) =>
                        setSignupState((current) => ({
                          ...current,
                          gender: event.target.value
                        }))
                      }
                      className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-3 text-sm outline-none focus:border-[#1f2a44]"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[#8f6f58]">
                      Role
                    </span>
                    <select
                      value={signupState.role}
                      onChange={(event) =>
                        setSignupState((current) => ({
                          ...current,
                          role: event.target.value
                        }))
                      }
                      className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-3 text-sm outline-none focus:border-[#1f2a44]"
                    >
                      {SIGNUP_ROLE_OPTIONS.map((roleOption) => (
                        <option key={roleOption.value} value={roleOption.value}>
                          {roleOption.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-[#7f6b58]">
                      Consultant role is assigned only after admin approval.
                    </p>
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#1f2a44] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#293654] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </form>
            )}

            {error && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {error}
              </motion.p>
            )}
            {errorList.length > 0 && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorList.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            )}

            <p className="mt-5 text-xs uppercase tracking-[0.16em] text-[#8f6f58]">
              Want to explore first? <Link to="/" className="font-semibold text-[#8a2918]">Go to landing</Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

export default AuthPage;
