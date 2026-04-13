import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import PageTransition from "../components/animations/PageTransition";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "../context/AuthContext";
import SwipeDeck from "../features/discover/SwipeDeck";
import {
  ApiError,
  createProfile,
  getMatches,
  sendInterest
} from "../services/matrimonyApi";
import { buildDefaultProfilePayload } from "../utils/profileTemplates";

function formatIncome(value) {
  const income = Number(value || 0);

  if (!income || Number.isNaN(income)) {
    return "Not mentioned";
  }

  if (income >= 100000) {
    return `${(income / 100000).toFixed(1)} LPA`;
  }

  return `${income}`;
}

function mapMatchToCard(match) {
  return {
    id: match.profileId,
    userId: match.userId,
    name: match.name,
    age: match.age,
    location: match.location,
    profession: match.profession,
    bio: match.bio,
    interests: match.interests || [],
    education: match.education,
    income: formatIncome(match.income),
    religion: match.religion,
    caste: match.caste,
    image: match.images?.[0]?.url || "",
    matchScore: match.discoveryScore ?? match.matchScore
  };
}

function DiscoverPage() {
  const { token, user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [error, setError] = useState("");
  const [needsProfile, setNeedsProfile] = useState(false);
  const profilesRef = useRef([]);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  async function loadMatches(options = {}) {
    const silent = Boolean(options.silent);

    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const data = await getMatches(token, { limit: 25, minScore: 0 });
      setProfiles((data.matches || []).map(mapMatchToCard));
      setNeedsProfile(false);
      setError("");
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.statusCode === 404 &&
        typeof err.message === "string" &&
        err.message.toLowerCase().includes("create your profile")
      ) {
        setNeedsProfile(true);
      } else {
        setError(err.message || "Unable to load matches");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }

      isFetchingRef.current = false;
    }
  }

  useEffect(() => {
    loadMatches();
  }, [token]);

  useEffect(() => {
    if (needsProfile) {
      return undefined;
    }

    const autoRefreshTimer = window.setInterval(() => {
      const shouldRefresh =
        profilesRef.current.length === 0 || error.toLowerCase().includes("verification");

      if (shouldRefresh) {
        loadMatches({ silent: true });
      }
    }, 7000);

    return () => {
      window.clearInterval(autoRefreshTimer);
    };
  }, [error, needsProfile, token]);

  useEffect(() => {
    if (needsProfile) {
      return undefined;
    }

    function handleWindowFocus() {
      loadMatches({ silent: true });
    }

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [needsProfile, token]);

  async function handleCreateProfile() {
    setError("");
    setLoading(true);

    try {
      await createProfile(token, buildDefaultProfilePayload(user));
      await loadMatches();
    } catch (err) {
      if (!(err instanceof ApiError) || err.statusCode !== 409) {
        setError(err.message || "Unable to create profile");
      } else {
        await loadMatches();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(profile, direction) {
    if (direction === "left") {
      setActionMessage(`Passed ${profile.name}`);
      return true;
    }

    try {
      await sendInterest(token, profile.userId);
      setActionMessage(`Interest sent to ${profile.name}. Once accepted, you can chat.`);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        setActionMessage(`Already connected/pending with ${profile.name}. Check chat page.`);
        return true;
      }

      setError(err.message || "Unable to send interest");
      return false;
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[radial-gradient(circle_at_80%_8%,rgba(130,161,214,0.17),transparent_30%),radial-gradient(circle_at_15%_20%,rgba(249,172,129,0.2),transparent_29%),linear-gradient(180deg,#fffaf5_0%,#fffefc_100%)] text-[#1f2a44]">
        <Navbar />
        <main className="mx-auto max-w-7xl px-5 pb-16 pt-9 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42 }}
            className="mb-8"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#926f50]">
              Discover
            </p>
            <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">
              Swipe Through Curated Profiles
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#57617b]">
              Live discovery from backend matches. Right swipe sends interest. Once accepted by the other user, chat unlocks automatically.
            </p>
          </motion.div>

          {needsProfile ? (
            <section className="rounded-3xl border border-[#e6d5c8] bg-white/85 p-8">
              <h2 className="font-display text-3xl font-semibold text-[#1f2a44]">
                Profile required for discovery
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#57617b]">
                Create your profile first, then we can show personalized matches like Riya and others.
              </p>
              <button
                type="button"
                onClick={handleCreateProfile}
                disabled={loading}
                className="mt-6 rounded-full bg-[#1f2a44] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2a3858] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Creating profile..." : "Create My Profile"}
              </button>
            </section>
          ) : loading ? (
            <section className="rounded-3xl border border-[#e6d5c8] bg-white/85 p-8">
              <p className="text-sm text-[#57617b]">Loading your curated matches...</p>
            </section>
          ) : (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e6d5c8] bg-white/85 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c7391]">
                  Live Discover
                </p>
                <button
                  type="button"
                  onClick={() => loadMatches({ silent: true })}
                  className="rounded-full border border-[#cfd7ea] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#2b3658] transition hover:bg-[#eef2ff]"
                >
                  Refresh Profiles
                </button>
              </div>
              <SwipeDeck profiles={profiles} onDecision={handleDecision} />
            </section>
          )}

          {(actionMessage || error) && (
            <section className="mt-6 space-y-3">
              {actionMessage && (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-700">
                  {actionMessage}
                </p>
              )}
              {error && (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">
                  {error}
                </p>
              )}
            </section>
          )}
        </main>
      </div>
    </PageTransition>
  );
}

export default DiscoverPage;
