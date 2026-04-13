import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import PageTransition from "../components/animations/PageTransition";
import Navbar from "../components/layout/Navbar";
import ChatWorkspace from "../features/chat/ChatWorkspace";
import { useAuth } from "../context/AuthContext";
import {
  acceptInterest,
  ApiError,
  createChatSocket,
  getInteractions,
  getMessages,
  getMyServiceBookings,
  getProfileByUser,
  rejectInterest,
  sendMessageHttp
} from "../services/matrimonyApi";

function formatMessageTime(isoDate) {
  if (!isoDate) {
    return "Now";
  }

  const date = new Date(isoDate);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function mapMessageForUi(message, currentUserId) {
  return {
    id: message.messageId,
    fromMe: message.senderUserId === currentUserId,
    content: message.content,
    time: formatMessageTime(message.createdAt),
    createdAt: message.createdAt,
    chatAccessType: message.chatAccessType || "match",
    serviceRole: message.serviceRole || null
  };
}

function makeFallbackName(userId) {
  if (!userId) {
    return "User";
  }

  return `User ${userId.slice(-4)}`;
}

function ChatPage() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [threads, setThreads] = useState([]);
  const [messagesByThread, setMessagesByThread] = useState({});
  const [incomingPending, setIncomingPending] = useState([]);
  const [sending, setSending] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const activeThreadIdRef = useRef(null);
  const socketRef = useRef(null);
  const profileCacheRef = useRef(new Map());

  activeThreadIdRef.current = activeThreadId;

  const acceptedThreadIds = useMemo(
    () => new Set(threads.map((thread) => thread.id)),
    [threads]
  );

  async function resolveDisplayProfile(counterpartUserId) {
    const cached = profileCacheRef.current.get(counterpartUserId);

    if (cached) {
      return cached;
    }

    try {
      const profile = await getProfileByUser(token, counterpartUserId);
      const mapped = {
        name: profile.name || makeFallbackName(counterpartUserId),
        avatar: profile.images?.[0]?.url || ""
      };

      profileCacheRef.current.set(counterpartUserId, mapped);
      return mapped;
    } catch (_error) {
      const fallback = {
        name: makeFallbackName(counterpartUserId),
        avatar: ""
      };

      profileCacheRef.current.set(counterpartUserId, fallback);
      return fallback;
    }
  }

async function fetchConversationPreview(counterpartUserId) {
  try {
    const conversation = await getMessages(token, counterpartUserId, { limit: 1 });
    const latestMessage = conversation.messages?.[0];

    if (!latestMessage) {
      return {
        lastMessage: "No messages yet",
        lastMessageAt: null,
        chatAccessType: conversation.chatAccessType || "match",
        serviceRole: conversation.serviceRole || null
      };
    }

    return {
      lastMessage: latestMessage.content,
      lastMessageAt: latestMessage.createdAt || null,
      chatAccessType: latestMessage.chatAccessType || conversation.chatAccessType || "match",
      serviceRole: latestMessage.serviceRole || conversation.serviceRole || null
    };
  } catch (_error) {
    return {
      lastMessage: "No messages yet",
      lastMessageAt: null,
      chatAccessType: "match",
      serviceRole: null
    };
  }
}

  async function loadChatData() {
    setLoading(true);
    setError("");

    try {
      const [interactionData, serviceBookingData] = await Promise.all([
        getInteractions(token, { limit: 100 }),
        getMyServiceBookings(token, {
          direction: "all",
          status: "accepted",
          limit: 100
        })
      ]);

      const allInteractions = interactionData.interactions || [];
      const acceptedServiceBookings = serviceBookingData.bookings || [];

      const acceptedInteractions = allInteractions.filter(
        (interaction) => interaction.relationshipStatus === "accepted"
      );
      const incomingPendingInteractions = allInteractions.filter(
        (interaction) => interaction.isIncomingPending
      );

      const acceptedCounterpartIdsFromMatches = acceptedInteractions.map(
        (interaction) => interaction.counterpartUserId
      );
      const serviceBookingByCounterpart = acceptedServiceBookings.reduce((accumulator, booking) => {
        const counterpartUserId =
          booking.requesterUserId === user.id ? booking.providerUserId : booking.requesterUserId;
        const existingBooking = accumulator.get(counterpartUserId);

        if (!existingBooking) {
          accumulator.set(counterpartUserId, booking);
          return accumulator;
        }

        const existingUpdatedAt = new Date(existingBooking.updatedAt || 0).getTime();
        const candidateUpdatedAt = new Date(booking.updatedAt || 0).getTime();

        if (candidateUpdatedAt >= existingUpdatedAt) {
          accumulator.set(counterpartUserId, booking);
        }

        return accumulator;
      }, new Map());

      const acceptedCounterpartIdsFromServiceBookings = Array.from(
        serviceBookingByCounterpart.keys()
      );
      const acceptedCounterpartIds = [
        ...new Set([
          ...acceptedCounterpartIdsFromMatches,
          ...acceptedCounterpartIdsFromServiceBookings
        ])
      ];

      const uniqueCounterpartIds = [
        ...new Set(
          [...acceptedCounterpartIds, ...incomingPendingInteractions.map((interaction) => interaction.counterpartUserId)]
        )
      ];

      await Promise.all(uniqueCounterpartIds.map(resolveDisplayProfile));

      const acceptedThreadData = await Promise.all(
        acceptedCounterpartIds.map(async (counterpartUserId) => {
          const profile = profileCacheRef.current.get(counterpartUserId);
          const preview = await fetchConversationPreview(counterpartUserId);

          return {
            id: counterpartUserId,
            name: profile?.name || makeFallbackName(counterpartUserId),
            avatar: profile?.avatar || "",
            status: preview.chatAccessType === "service_connection" ? "service-connected" : "matched",
            threadType:
              preview.chatAccessType === "service_connection" ? "service_connection" : "match",
            serviceRole:
              preview.chatAccessType === "service_connection"
                ? preview.serviceRole ||
                  serviceBookingByCounterpart.get(counterpartUserId)?.serviceType ||
                  null
                : null,
            lastMessage: preview.lastMessage,
            lastMessageAt: preview.lastMessageAt,
            unreadCount: 0
          };
        })
      );

      const sortedThreads = acceptedThreadData.sort((a, b) => {
        if (!a.lastMessageAt && !b.lastMessageAt) {
          return a.name.localeCompare(b.name);
        }

        if (!a.lastMessageAt) {
          return 1;
        }

        if (!b.lastMessageAt) {
          return -1;
        }

        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });

      setThreads(sortedThreads);
      setIncomingPending(
        incomingPendingInteractions.map((interaction) => {
          const profile = profileCacheRef.current.get(interaction.counterpartUserId);

          return {
            interactionId: interaction.interactionId,
            counterpartUserId: interaction.counterpartUserId,
            counterpartName:
              profile?.name || makeFallbackName(interaction.counterpartUserId)
          };
        })
      );
    } catch (err) {
      setError(err.message || "Unable to load chat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChatData();
  }, [token, user?.id]);

  useEffect(() => {
    if (!token || !user?.id) {
      return undefined;
    }

    const socket = createChatSocket(token);
    socketRef.current = socket;

    socket.on("chat:new_message", (message) => {
      const counterpartUserId =
        message.senderUserId === user.id ? message.receiverUserId : message.senderUserId;

      if (!acceptedThreadIds.has(counterpartUserId)) {
        return;
      }

      const mappedMessage = mapMessageForUi(message, user.id);

      setMessagesByThread((current) => {
        const existingMessages = current[counterpartUserId] || [];

        if (existingMessages.some((item) => item.id === mappedMessage.id)) {
          return current;
        }

        return {
          ...current,
          [counterpartUserId]: [...existingMessages, mappedMessage]
        };
      });

      setThreads((currentThreads) =>
        currentThreads
          .map((thread) => {
            if (thread.id !== counterpartUserId) {
              return thread;
            }

            const isActive = activeThreadIdRef.current === counterpartUserId;

            return {
              ...thread,
              lastMessage: mappedMessage.content,
              lastMessageAt: mappedMessage.createdAt || new Date().toISOString(),
              unreadCount: isActive || mappedMessage.fromMe ? 0 : (thread.unreadCount || 0) + 1
            };
          })
          .sort((a, b) => {
            if (!a.lastMessageAt && !b.lastMessageAt) {
              return a.name.localeCompare(b.name);
            }

            if (!a.lastMessageAt) {
              return 1;
            }

            if (!b.lastMessageAt) {
              return -1;
            }

            return (
              new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
            );
          })
      );
    });

    socket.on("connect_error", (socketError) => {
      setError(socketError.message || "Socket connection failed");
    });

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [acceptedThreadIds, token, user?.id]);

  useEffect(() => {
    if (!activeThreadId || !acceptedThreadIds.has(activeThreadId)) {
      return;
    }

    if (messagesByThread[activeThreadId]) {
      return;
    }

    let mounted = true;

    getMessages(token, activeThreadId, { limit: 100 })
      .then((conversation) => {
        if (!mounted) {
          return;
        }

        setMessagesByThread((current) => ({
          ...current,
          [activeThreadId]: (conversation.messages || []).map((message) =>
            mapMessageForUi(message, user.id)
          )
        }));
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || "Unable to fetch messages");
        }
      });

    return () => {
      mounted = false;
    };
  }, [acceptedThreadIds, activeThreadId, messagesByThread, token, user?.id]);

  useEffect(() => {
    if (!activeThreadId) {
      return;
    }

    setThreads((currentThreads) =>
      currentThreads.map((thread) =>
        thread.id === activeThreadId
          ? {
              ...thread,
              unreadCount: 0
            }
          : thread
      )
    );
  }, [activeThreadId]);

  async function handleDecision(interactionId, actionType) {
    try {
      if (actionType === "accept") {
        await acceptInterest(token, interactionId);
      } else {
        await rejectInterest(token, interactionId);
      }

      await loadChatData();
    } catch (err) {
      setError(err.message || `Unable to ${actionType} interest`);
    }
  }

  async function handleSendMessage(counterpartUserId, content) {
    setError("");
    setSending(true);

    try {
      const socket = socketRef.current;

      if (socket?.connected) {
        const ack = await new Promise((resolve) => {
          const timeoutId = setTimeout(() => {
            resolve({
              ok: false,
              message: "Message send timed out"
            });
          }, 5000);

          socket.emit(
            "chat:send",
            {
              toUserId: counterpartUserId,
              content
            },
            (payload) => {
              clearTimeout(timeoutId);
              resolve(payload);
            }
          );
        });

        if (ack?.ok) {
          return true;
        }

        if (ack?.message) {
          setError(ack.message);
          return false;
        }
      }

      const sentMessage = await sendMessageHttp(token, counterpartUserId, content);

      setMessagesByThread((current) => {
        const existingMessages = current[counterpartUserId] || [];

        if (existingMessages.some((item) => item.id === sentMessage.messageId)) {
          return current;
        }

        return {
          ...current,
          [counterpartUserId]: [
            ...existingMessages,
            mapMessageForUi(sentMessage, user.id)
          ]
        };
      });

      setThreads((currentThreads) =>
        currentThreads
          .map((thread) =>
            thread.id === counterpartUserId
              ? {
                  ...thread,
                  lastMessage: content,
                  lastMessageAt: new Date().toISOString()
                }
              : thread
          )
          .sort((a, b) => {
            if (!a.lastMessageAt && !b.lastMessageAt) {
              return a.name.localeCompare(b.name);
            }

            if (!a.lastMessageAt) {
              return 1;
            }

            if (!b.lastMessageAt) {
              return -1;
            }

            return (
              new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
            );
          })
      );

      return true;
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 403) {
        setError("Chat is enabled only after match interest or service booking is accepted.");
      } else {
        setError(err.message || "Unable to send message");
      }

      return false;
    } finally {
      setSending(false);
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[radial-gradient(circle_at_8%_10%,rgba(245,168,124,0.17),transparent_26%),radial-gradient(circle_at_92%_15%,rgba(119,149,203,0.2),transparent_24%),linear-gradient(180deg,#fffaf6_0%,#f8fbff_100%)] text-[#1f2a44]">
        <Navbar />

        <main className="mx-auto max-w-7xl px-5 pb-16 pt-9 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8f6e55]">
              Secure Chat
            </p>
            <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">
              Chat With Accepted Connections
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#55607a]">
              Match connections and accepted service bookings (consultant, lawyer, decorator)
              appear here as live chat threads.
            </p>
          </motion.div>

          {user?.role === "normal_user" && incomingPending.length > 0 && (
            <section className="mb-6 rounded-3xl border border-[#eadccf] bg-white/85 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8f6f58]">
                Pending Requests
              </p>
              <div className="mt-4 space-y-3">
                {incomingPending.map((item) => (
                  <div
                    key={item.interactionId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ebdfd4] bg-[#fff8f2] px-4 py-3"
                  >
                    <p className="text-sm font-medium text-[#1f2a44]">
                      {item.counterpartName} sent you interest
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDecision(item.interactionId, "reject")}
                        className="rounded-full border border-rose-200 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:bg-rose-50"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision(item.interactionId, "accept")}
                        className="rounded-full bg-[#1f2a44] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#2c3a5b]"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {loading ? (
            <section className="rounded-3xl border border-[#eadccf] bg-white/80 p-6">
              <p className="text-sm text-[#56607c]">Loading your conversations...</p>
            </section>
          ) : (
            <ChatWorkspace
              threads={threads}
              messagesByThread={messagesByThread}
              onSendMessage={handleSendMessage}
              sending={sending}
              onActiveThreadChange={setActiveThreadId}
            />
          )}

          {threads.length === 0 && !loading && (
            <section className="mt-6 rounded-3xl border border-[#eadccf] bg-white/80 p-6">
              <p className="text-sm text-[#56607c]">
                No accepted chats yet. Send interest from Discover, then have the other user accept.
              </p>
            </section>
          )}

          {error && (
            <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3">
              <p className="text-sm text-rose-700">{error}</p>
            </section>
          )}
        </main>
      </div>
    </PageTransition>
  );
}

export default ChatPage;
