import { io } from "socket.io-client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

export function createChatSocket(jwtToken) {
  const socket = io(SOCKET_URL, {
    transports: ["websocket"],
    auth: {
      token: jwtToken
    }
  });

  return socket;
}

export async function fetchConversation(jwtToken, otherUserId, { limit = 30 } = {}) {
  const response = await fetch(
    `${API_BASE_URL}/chats/with/${otherUserId}/messages?limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${jwtToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch conversation");
  }

  const result = await response.json();
  return result.data;
}

export async function sendMessageHttp(jwtToken, otherUserId, content) {
  const response = await fetch(`${API_BASE_URL}/chats/with/${otherUserId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`
    },
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    throw new Error("Failed to send message");
  }

  const result = await response.json();
  return result.data;
}

// Example usage inside a React component:
// const socket = createChatSocket(token);
// socket.on("chat:new_message", (message) => {
//   setMessages((prev) => [...prev, message]);
// });
// socket.emit("chat:send", { toUserId: targetUserId, content: "Hello!" }, (ack) => {
//   if (!ack.ok) console.error(ack.message);
// });
