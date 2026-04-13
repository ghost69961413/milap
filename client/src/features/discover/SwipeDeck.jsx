import { useEffect, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform
} from "framer-motion";
import ProfileSwipeCard from "./ProfileSwipeCard";

function SwipeDeck({ profiles, onDecision }) {
  const [deck, setDeck] = useState(profiles || []);
  const [lastAction, setLastAction] = useState(null);
  const [processing, setProcessing] = useState(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-14, 14]);
  const actionOpacity = useTransform(x, [-170, -20, 20, 170], [1, 0, 0, 1]);
  const passOpacity = useTransform(x, [-160, -20], [1, 0]);
  const interestedOpacity = useTransform(x, [20, 160], [0, 1]);

  const activeProfile = deck[0];

  useEffect(() => {
    setDeck(profiles || []);
  }, [profiles]);

  async function swipeCurrent(direction) {
    if (!activeProfile || processing) {
      return;
    }

    setProcessing(true);

    try {
      const shouldContinue = await onDecision?.(activeProfile, direction);

      if (shouldContinue === false) {
        animate(x, 0, { type: "spring", stiffness: 360, damping: 28 });
        return;
      }

      setLastAction({
        profileName: activeProfile.name,
        decision: direction === "right" ? "Interested" : "Passed"
      });

      setDeck((currentDeck) => currentDeck.slice(1));
      x.set(0);
    } finally {
      setProcessing(false);
    }
  }

  function handleDragEnd(_event, info) {
    if (processing) {
      return;
    }

    if (info.offset.x > 130) {
      swipeCurrent("right");
      return;
    }

    if (info.offset.x < -130) {
      swipeCurrent("left");
      return;
    }

    animate(x, 0, { type: "spring", stiffness: 360, damping: 28 });
  }

  return (
    <section className="grid gap-7 xl:grid-cols-[0.65fr_0.35fr]">
      <div className="relative h-[35rem]">
        <AnimatePresence mode="wait">
          {!activeProfile && (
            <motion.div
              key="empty_deck"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full items-center justify-center rounded-[2rem] border border-dashed border-[#d7c9bc] bg-[#fff8f2]"
            >
              <div className="max-w-sm text-center">
                <p className="font-display text-3xl font-semibold text-[#1f2a44]">
                  Deck completed
                </p>
                <p className="mt-3 text-sm leading-6 text-[#5d6681]">
                  You reviewed all available profiles for now. New curated matches will appear soon.
                </p>
              </div>
            </motion.div>
          )}

          {activeProfile && (
            <motion.div key={activeProfile.id} className="absolute inset-0">
              {deck
                .slice(1, 3)
                .reverse()
                .map((profile, index) => (
                  <motion.div
                    key={profile.id}
                    className="absolute inset-0"
                    style={{
                      scale: 0.96 - index * 0.03,
                      y: 10 + index * 10,
                      opacity: 0.65 - index * 0.2
                    }}
                  >
                    <ProfileSwipeCard profile={profile} />
                  </motion.div>
                ))}

              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                style={{ x, rotate }}
                onDragEnd={handleDragEnd}
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
              >
                <ProfileSwipeCard profile={activeProfile} />

                <motion.div
                  style={{ opacity: interestedOpacity }}
                  className="pointer-events-none absolute left-6 top-6 rounded-xl border border-emerald-300 bg-emerald-500/80 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white"
                >
                  Interested
                </motion.div>

                <motion.div
                  style={{ opacity: passOpacity }}
                  className="pointer-events-none absolute right-6 top-6 rounded-xl border border-rose-300 bg-rose-500/80 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white"
                >
                  Pass
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-4 rounded-[2rem] border border-[#e8d9cc] bg-white/85 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9a6a43]">
          Swipe Insights
        </p>
        <h3 className="font-display text-3xl font-semibold text-[#1f2a44]">
          Review profiles naturally.
        </h3>
        <p className="text-sm leading-7 text-[#57607b]">
          Drag right to show interest and drag left to skip. This interaction syncs with your preferences and helps refine upcoming recommendations.
        </p>

        <div className="rounded-2xl border border-[#eadfd5] bg-[#fff9f4] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[#967052]">Latest Action</p>
          <p className="mt-2 text-sm text-[#1f2a44]">
            {lastAction
              ? `${lastAction.decision}: ${lastAction.profileName}`
              : "No action yet. Start swiping."}
          </p>
          <motion.div
            style={{ opacity: actionOpacity }}
            className="mt-3 h-1 rounded-full bg-gradient-to-r from-[#f4835a] to-[#1f2a44]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => swipeCurrent("left")}
            disabled={processing}
            className="rounded-full border border-[#d5b9b0] px-4 py-3 text-sm font-semibold text-[#7d2a20] transition hover:bg-[#fff2ee]"
          >
            Pass
          </button>
          <button
            type="button"
            onClick={() => swipeCurrent("right")}
            disabled={processing}
            className="rounded-full bg-[#1f2a44] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#293654] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {processing ? "Please wait..." : "Interested"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default SwipeDeck;
