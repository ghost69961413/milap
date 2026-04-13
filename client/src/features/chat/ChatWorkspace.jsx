import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

function ChatWorkspace({
  threads,
  messagesByThread,
  onSendMessage,
  sending,
  onActiveThreadChange
}) {
  const [activeThreadId, setActiveThreadId] = useState(threads[0]?.id || null);
  const [draft, setDraft] = useState("");

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) || null,
    [threads, activeThreadId]
  );

  const activeMessages = messagesByThread[activeThreadId] || [];

  useEffect(() => {
    if (!threads.length) {
      setActiveThreadId(null);
      return;
    }

    if (!activeThreadId || !threads.some((thread) => thread.id === activeThreadId)) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId]);

  useEffect(() => {
    onActiveThreadChange?.(activeThreadId);
  }, [activeThreadId, onActiveThreadChange]);

  async function sendMessage() {
    const message = draft.trim();

    if (!message || !activeThreadId) {
      return;
    }

    const sent = await onSendMessage(activeThreadId, message);

    if (sent) {
      setDraft("");
    }
  }

  function getThreadBadgeLabel(thread) {
    if (thread.threadType !== "service_connection") {
      return "Match";
    }

    if (!thread.serviceRole) {
      return "Service";
    }

    return thread.serviceRole.charAt(0).toUpperCase() + thread.serviceRole.slice(1);
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[0.32fr_0.68fr]">
      <aside className="rounded-[2rem] border border-[#e9dccc] bg-white/85 p-4">
        <p className="px-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#956f50]">
          Conversations
        </p>
        <div className="mt-4 space-y-2">
          {threads.map((thread) => {
            const isActive = thread.id === activeThreadId;

            return (
              <motion.button
                key={thread.id}
                type="button"
                whileHover={{ y: -2 }}
                onClick={() => setActiveThreadId(thread.id)}
                className={[
                  "w-full rounded-2xl border px-4 py-3 text-left transition",
                  isActive
                    ? "border-[#1f2a44] bg-[#1f2a44] text-white"
                    : "border-[#ece0d6] bg-[#fff9f4] text-[#1f2a44]"
                ].join(" ")}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">{thread.name}</p>
                    <p
                      className={[
                        "mt-1 inline-flex rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em]",
                        isActive ? "bg-white/20 text-white" : "bg-[#e7edf9] text-[#415278]"
                      ].join(" ")}
                    >
                      {getThreadBadgeLabel(thread)}
                    </p>
                    <p
                      className={[
                        "mt-1 text-xs",
                        isActive ? "text-[#dce5ff]" : "text-[#646d87]"
                      ].join(" ")}
                    >
                      {thread.lastMessage}
                    </p>
                  </div>
                  {thread.unreadCount > 0 && (
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        isActive ? "bg-white text-[#1f2a44]" : "bg-[#1f2a44] text-white"
                      ].join(" ")}
                    >
                      {thread.unreadCount}
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </aside>

      <div className="rounded-[2rem] border border-[#e8dbce] bg-white/85 p-5">
        {activeThread ? (
          <>
            <div className="flex items-center justify-between rounded-2xl border border-[#ece1d7] bg-[#fff8f2] px-4 py-3">
              <div>
                <p className="font-display text-2xl font-semibold text-[#1f2a44]">
                  {activeThread.name}
                </p>
                <p className="text-xs uppercase tracking-[0.2em] text-[#8f6f57]">
                  {activeThread.threadType === "service_connection"
                    ? `${getThreadBadgeLabel(activeThread)} Connection`
                    : "Matched Connection"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <motion.span
                  className="h-2 w-2 rounded-full bg-emerald-500"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                />
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#6d748f]">
                  Secure
                </p>
              </div>
            </div>

            <div className="mt-4 h-[29rem] overflow-y-auto rounded-2xl border border-[#efe4db] bg-[#fdf9f5] p-4">
              <AnimatePresence initial={false}>
                {activeMessages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className={[
                      "mb-3 max-w-[76%] rounded-2xl px-4 py-2.5 text-sm leading-6",
                      message.fromMe
                        ? "ml-auto rounded-br-sm bg-[#1f2a44] text-white"
                        : "rounded-bl-sm border border-[#e8daca] bg-white text-[#1f2a44]"
                    ].join(" ")}
                  >
                    <p>{message.content}</p>
                    <p
                      className={[
                        "mt-1 text-[0.63rem] uppercase tracking-[0.18em]",
                        message.fromMe ? "text-[#cad7f7]" : "text-[#8f7a67]"
                      ].join(" ")}
                    >
                      {message.time}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a thoughtful message..."
                className="flex-1 rounded-full border border-[#ddcabc] bg-white px-5 py-3 text-sm text-[#1f2a44] outline-none placeholder:text-[#927962] focus:border-[#1f2a44]"
              />
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={sendMessage}
                disabled={sending}
                className="rounded-full bg-[#8a2918] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#a53622]"
              >
                {sending ? "Sending..." : "Send"}
              </motion.button>
            </div>
          </>
        ) : (
          <div className="flex h-[32rem] items-center justify-center">
            <p className="text-sm text-[#68708a]">Select a conversation to start chatting.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default ChatWorkspace;
