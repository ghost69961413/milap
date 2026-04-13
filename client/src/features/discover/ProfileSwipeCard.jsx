import { motion } from "framer-motion";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80";

function ProfileSwipeCard({ profile }) {
  const displayImage = profile.image || FALLBACK_IMAGE;

  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.01, boxShadow: "0 24px 46px rgba(24, 31, 50, 0.26)" }}
      className="relative h-[34rem] overflow-hidden rounded-[2rem] border border-white/40 bg-slate-900 text-white"
    >
      <img
        src={displayImage}
        alt={`${profile.name} profile`}
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 via-slate-900/30 to-slate-950/95" />

      <div className="relative flex h-full flex-col justify-end p-6">
        <div className="rounded-2xl border border-white/20 bg-black/30 p-5 backdrop-blur-md">
          <h3 className="font-display text-3xl font-semibold">
            {profile.name}, {profile.age}
          </h3>
          <p className="mt-1 text-sm uppercase tracking-[0.22em] text-amber-200">
            {profile.location} • {profile.profession}
          </p>
          {typeof profile.matchScore === "number" && (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Match Score: {profile.matchScore}%
            </p>
          )}

          <p className="mt-4 text-sm leading-6 text-slate-200">{profile.bio}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <span
                key={interest}
                className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white"
              >
                {interest}
              </span>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-200">
            <p className="rounded-xl bg-white/10 px-3 py-2">Education: {profile.education}</p>
            <p className="rounded-xl bg-white/10 px-3 py-2">Income: {profile.income}</p>
            <p className="rounded-xl bg-white/10 px-3 py-2">Religion: {profile.religion}</p>
            <p className="rounded-xl bg-white/10 px-3 py-2">Caste: {profile.caste}</p>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default ProfileSwipeCard;
