/* components/ChatSection.jsx */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker from "emoji-picker-react";
import api from "../api"; 
import "./styles/ChatSection.css"; 
import ManageUsersModal from "./ManageUsersModal";

export default function ChatSection({
  currentUser,
  roomId,
  roomName,
  messages,
  setMessages,
  onNewMessage,
  users,
  roomCreatorId,
}) {
  const [newMessage, setNewMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const [manageUsersModal, setManageUsersModal] = useState({ open: false });
  const [participants, setParticipants] = useState([]);

  const ws = useRef(null);
  const messagesEndRef = useRef(null);

  const getOtherUserId = (roomName) => {
    if (!currentUser || !roomName) return null;
    const parts = roomName.split("_");
    if (parts.length < 3) return null;
    const id1 = parseInt(parts[1]);
    const id2 = parseInt(parts[2]);
    if (isNaN(id1) || isNaN(id2)) return null;
    return id1 === currentUser.id ? id2 : id1;
  };

  const otherUserId = getOtherUserId(roomName);
  const otherUser = otherUserId ? users.find((u) => u.id === otherUserId) : null;
  const headerName = otherUser ? otherUser.username : roomName;

  const scrollToBottom = (behavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  const fetchHistory = async () => {
    if (!currentUser?.token) return;
    setLoading(true);

    try {
      let allMessages = [];
      // Use dynamic backend host
      const backendHost =
        window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
          ? "http://127.0.0.1:8000/api"
          : `https://${window.location.hostname}/api`;
      let url = `/chat/messages/${roomName}/`;

      while (url) {
        const res = await api.get(url, {
          baseURL: backendHost, // dynamically set backend base
          headers: { Authorization: `Bearer ${currentUser.token}` },
        });

        const data = res.data;
        allMessages = [...allMessages, ...data.results];

        // Update URL for next page, keep it relative
        url = data.next ? data.next.replace(backendHost, "") : null;
      }

      allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      setMessages(allMessages);
      localStorage.setItem(`chat-${roomName}`, JSON.stringify(allMessages));
      scrollToBottom("auto");
    } catch (err) {
      console.error("❌ Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.token) return;

    const cached = localStorage.getItem(`chat-${roomName}`);
    if (cached) {
      setMessages(JSON.parse(cached));
    }

    fetchHistory();
  }, [currentUser?.token, roomName]);

  useEffect(() => {
    if (!currentUser?.token) return;

    if (ws.current) return; // already initialized

    // Determine protocol automatically
    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";

    // Use the same host as the frontend for WebSocket
    const backendHost = window.location.hostname; // dynamic host
    const backendPort = window.location.protocol === "https:" ? "" : ":8000"; // only add port if http

    const token =
      currentUser?.token ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");

    const wsUrl = `${wsScheme}://${backendHost}${backendPort}/ws/chat/${roomName}/?token=${token}`;
    console.log("🧠 Attempting WebSocket connection:", wsUrl);

    try {
      ws.current = new WebSocket(wsUrl);
    } catch (err) {
      console.error("💥 WebSocket failed to initialize:", err);
      return;
    }

    ws.current.onopen = () => {
      console.log("✅ WebSocket connected!");
      setConnected(true);
    };

    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setMessages((prev) => {
          const updated = [...prev, data];
          localStorage.setItem(`chat-${roomName}`, JSON.stringify(updated));
          return updated;
        });
        scrollToBottom("smooth");
      } catch (err) {
        console.error("❌ Failed to parse WS message:", err);
      }
    };

    ws.current.onclose = (e) => {
      console.warn("⚠️ WS closed:", e.code, e.reason);
      setConnected(false);
    };

    ws.current.onerror = (err) => {
      console.error("❌ WS Error:", err);
    };

    return () => {
      ws.current?.close();
      ws.current = null;
    };
  }, [currentUser?.token, roomName]);


  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom("auto");
    }
  }, [messages, loading]);

  const sendMessage = () => {
    if (!newMessage.trim() || !connected) {
      console.warn("⚠️ Send blocked (empty or disconnected).");
      return;
    }
    //console.log("💬 Sending message:", newMessage);
    ws.current.send(JSON.stringify({ message: newMessage }));
    setNewMessage("");
    setShowEmoji(false);
    scrollToBottom();
  };

  const getInitials = (name) => name?.charAt(0).toUpperCase() || "?";

  const handleFetchParticipants = async () => {
    if (!roomId) return alert("Room ID not available");
    try {
      const res = await api.get(`/chat/rooms/${roomId}/participants/`, {
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      setParticipants(res.data);
      setManageUsersModal({ open: true });
    } catch (err) {
      console.error("❌ Failed to fetch participants:", err);
      alert("Failed to load participants");
    }
  };

  return (
    <div className="chat-wrapper">
      <div className="chat-header">
        <h2>💬 {headerName}</h2>
        {roomId && currentUser.id === roomCreatorId && (
          <button className="manage-users-btn" onClick={handleFetchParticipants}>
            <span className="icon">👥</span> Manage Users
          </button>
        )}
      </div>

      <div className="chat-messages">
        {loading && (
          <div className="loading-animation">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="no-messages-placeholder">💬 Send a message</div>
        )}

        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={msg.id || idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`message-row ${
                msg.sender?.toLowerCase() ===
                currentUser.username?.toLowerCase()
                  ? "self"
                  : "other"
              }`}
            >
              {msg.sender?.toLowerCase() !==
                currentUser.username?.toLowerCase() && (
                <div className="avatar">{getInitials(msg.sender)}</div>
              )}
              <div
                className={`bubble ${
                  msg.sender?.toLowerCase() ===
                  currentUser.username?.toLowerCase()
                    ? "self"
                    : "other"
                }`}
              >
                <div className="sender">{msg.sender}</div>
                <div className="text">{msg.message}</div>
                <div className="time">
                  {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <button
          onClick={() => setShowEmoji((prev) => !prev)}
          className="emoji-btn"
        >
          😊
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (e.shiftKey) {
                const { selectionStart, selectionEnd } = e.target;
                const newValue =
                  newMessage.slice(0, selectionStart) +
                  "\n" +
                  newMessage.slice(selectionEnd);
                setNewMessage(newValue);
                setTimeout(() => {
                  e.target.selectionStart = e.target.selectionEnd =
                    selectionStart + 1;
                }, 0);
              } else {
                e.preventDefault();
                sendMessage();
              }
            }
          }}
          placeholder={connected ? "Type a message..." : "Connecting..."}
          disabled={!connected}
          rows={1}
          style={{ resize: "none" }}
          className="chat-textarea"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={sendMessage}
          disabled={!connected}
          className="send-btn"
        >
          ➤
        </motion.button>
        {showEmoji && (
          <div className="emoji-picker">
            <EmojiPicker
              onEmojiClick={(emojiData) =>
                setNewMessage((prev) => prev + emojiData.emoji)
              }
              theme="light"
            />
          </div>
        )}

        {manageUsersModal.open && (
          <ManageUsersModal
            roomId={roomId}
            roomCreatorId={roomCreatorId}
            currentUser={currentUser}
            participants={participants}
            onClose={() => setManageUsersModal({ open: false })}
            onRemoveUser={(userId) =>
              setParticipants((prev) => prev.filter((u) => u.id !== userId))
            }
          />
        )}
      </div>
    </div>
  );
}
