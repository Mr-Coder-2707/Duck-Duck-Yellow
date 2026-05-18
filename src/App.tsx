import { useState, useRef, useEffect, useCallback } from 'react';
import {
  generateDuckId,
  hashPassword,
  generateYellowCode,
  parseYellowCode,
  encryptMessage,
  decryptMessage,
} from './utils/crypto';
import logoImg from './image/logo.png';

// ======================== TYPES ========================

interface User {
  username: string;
  duckId: string;
}
interface StoredAccount {
  username: string;
  duckId: string;
  passwordHash: string;
}
interface MessageReaction {
  senderDuckId: string;
  senderName: string;
  emoji: string;
}

interface ChatMsg {
  id: string;
  text: string;
  isMine: boolean;
  timestamp: number;
  senderName: string;
  reactions?: MessageReaction[];
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  stickerId?: string;
}

interface BCEvent {
  type: 'message' | 'join' | 'leave' | 'typing' | 'reaction';
  senderDuckId: string;
  senderName: string;
  payload?: string;
  timestamp: number;
}

type View = 'auth' | 'dashboard' | 'chat';
type AuthMode = 'signup' | 'signin';

// ======================== STORAGE ========================

const ACCOUNTS_KEY = 'ddy_accounts';
const SESSION_KEY = 'ddy_session';

function getAccounts(): StoredAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
  } catch {
    return [];
  }
}
function saveAccount(acc: StoredAccount) {
  const all = getAccounts();
  all.push(acc);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(all));
}
function findAccount(duckId: string) {
  return getAccounts().find(a => a.duckId === duckId);
}
function getSession(): User | null {
  try {
    const d = localStorage.getItem(SESSION_KEY);
    return d ? JSON.parse(d) : null;
  } catch {
    return null;
  }
}
function saveSession(u: User) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(u));
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ======================== HELPERS ========================

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ======================== CUSTOM STICKERS ========================

const DuckSticker: React.FC<{ id: string; size?: number }> = ({ id, size = 90 }) => {
  const getStickerContent = () => {
    switch (id) {
      case 'duck_happy':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" className="animate-[bounce_0.8s_infinite]">
            <ellipse cx="42" cy="78" rx="8" ry="4" fill="#f97316" />
            <ellipse cx="58" cy="78" rx="8" ry="4" fill="#f97316" />
            <ellipse cx="50" cy="55" rx="28" ry="22" fill="#fbbf24" />
            <ellipse cx="38" cy="56" rx="10" ry="7" fill="#f59e0b" className="animate-[pulse_0.4s_infinite]" />
            <circle cx="62" cy="32" r="16" fill="#fbbf24" />
            <path d="M 72 30 Q 82 31 74 36 Z" fill="#f97316" />
            <circle cx="64" cy="27" r="2.5" fill="#1e293b" />
            <circle cx="65" cy="26" r="0.8" fill="#ffffff" />
            <circle cx="56" cy="35" r="3" fill="#f43f5e" opacity="0.6" />
          </svg>
        );
      case 'duck_cool':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" className="animate-[float_2s_ease-in-out_infinite]">
            <ellipse cx="42" cy="78" rx="8" ry="4" fill="#f97316" />
            <ellipse cx="58" cy="78" rx="8" ry="4" fill="#f97316" />
            <ellipse cx="50" cy="55" rx="28" ry="22" fill="#fbbf24" />
            <ellipse cx="36" cy="55" rx="12" ry="6" fill="#f59e0b" />
            <circle cx="62" cy="32" r="16" fill="#fbbf24" />
            <path d="M 72 30 L 80 32 L 72 34" stroke="#f97316" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 52 24 L 72 26" stroke="#1e293b" strokeWidth="2.5" />
            <path d="M 58 24 Q 61 32 64 27 Z M 66 25 Q 69 33 72 28 Z" fill="#1e293b" />
          </svg>
        );
      case 'duck_love':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" className="animate-[pulse_1.2s_infinite]">
            <path d="M 28 20 Q 28 14 32 14 T 36 20 Q 36 24 28 28 Q 20 24 20 20 T 24 14 Q 28 14 28 20" fill="#ef4444" className="animate-[float_1.5s_infinite] origin-center scale-75" />
            <ellipse cx="42" cy="78" rx="8" ry="4" fill="#f97316" />
            <ellipse cx="58" cy="78" rx="8" ry="4" fill="#f97316" />
            <ellipse cx="50" cy="55" rx="28" ry="22" fill="#fbbf24" />
            <circle cx="62" cy="32" r="16" fill="#fbbf24" />
            <path d="M 72 30 Q 80 32 72 35" stroke="#f97316" strokeWidth="2" fill="none" />
            <path d="M 58 24 C 58 21 61 21 61 24 C 61 26 58 28 58 29 C 58 28 55 26 55 24 C 55 21 58 21 58 24 Z" fill="#ef4444" />
            <path d="M 68 25 C 68 22 71 22 71 25 C 71 27 68 29 68 30 C 68 29 65 27 65 25 C 65 22 68 22 68 25 Z" fill="#ef4444" />
          </svg>
        );
      case 'duck_code':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" className="animate-[wiggle_0.5s_infinite]">
            <ellipse cx="45" cy="58" rx="26" ry="20" fill="#fbbf24" />
            <circle cx="56" cy="34" r="15" fill="#fbbf24" />
            <path d="M 64 32 Q 72 33 64 37" stroke="#f97316" strokeWidth="2" fill="none" />
            <circle cx="58" cy="29" r="2" fill="#1e293b" />
            <circle cx="58" cy="29" r="4.5" stroke="#475569" strokeWidth="1.5" fill="none" />
            <ellipse cx="44" cy="58" rx="10" ry="6" fill="#f59e0b" />
            <path d="M 62 65 L 82 65 L 78 50 Z" fill="#475569" />
            <path d="M 60 65 L 84 65 L 86 69 L 58 69 Z" fill="#94a3b8" />
            <circle cx="70" cy="58" r="1.5" fill="#fbbf24" className="animate-ping" />
          </svg>
        );
      case 'duck_sleep':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100">
            <ellipse cx="50" cy="58" rx="28" ry="18" fill="#fbbf24" className="animate-[pulse_2s_infinite]" />
            <circle cx="62" cy="36" r="16" fill="#fbbf24" />
            <path d="M 72 34 L 79 37 L 72 39 Z" fill="#f97316" />
            <path d="M 60 30 Q 64 34 68 30" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
            <rect x="52" y="24" width="18" height="8" rx="3" fill="#3b82f6" opacity="0.8" />
            <text x="24" y="28" fill="#93c5fd" fontSize="10" className="animate-[bounce_1.5s_infinite] font-bold">Z</text>
            <text x="32" y="22" fill="#60a5fa" fontSize="13" className="animate-[bounce_2s_infinite] font-bold">z</text>
          </svg>
        );
      case 'duck_shock':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" className="animate-[wiggle_0.2s_infinite]">
            <ellipse cx="50" cy="55" rx="28" ry="22" fill="#fbbf24" />
            <circle cx="62" cy="32" r="16" fill="#fbbf24" />
            <circle cx="72" cy="37" r="5" fill="#7c2d12" />
            <circle cx="60" cy="26" r="4.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
            <circle cx="60" cy="26" r="1.5" fill="#1e293b" />
            <circle cx="68" cy="27" r="4.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
            <circle cx="68" cy="27" r="1.5" fill="#1e293b" />
          </svg>
        );
      case 'duck_cry':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" className="animate-[float_2s_infinite]">
            <ellipse cx="42" cy="78" rx="8" ry="4" fill="#f97316" />
            <ellipse cx="58" cy="78" rx="8" ry="4" fill="#f97316" />
            <ellipse cx="50" cy="55" rx="28" ry="22" fill="#fbbf24" />
            <circle cx="62" cy="32" r="16" fill="#fbbf24" />
            <path d="M 72 32 Q 77 37 72 40 Z" fill="#f97316" />
            <path d="M 64 28 L 64 45 M 68 29 L 68 40" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" className="animate-[pulse_0.5s_infinite]" />
            <path d="M 58 26 Q 62 23 66 26" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        );
      case 'duck_rich':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" className="animate-[float_1.8s_ease-in-out_infinite]">
            <circle cx="25" cy="65" r="6" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
            <circle cx="35" cy="70" r="6" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
            <circle cx="75" cy="68" r="6" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
            <ellipse cx="42" cy="78" rx="8" ry="4" fill="#f97316" />
            <ellipse cx="58" cy="78" rx="8" ry="4" fill="#f97316" />
            <ellipse cx="50" cy="55" rx="28" ry="22" fill="#fbbf24" />
            <circle cx="62" cy="32" r="16" fill="#fbbf24" />
            <path d="M 72 30 Q 82 31 74 36 Z" fill="#f97316" />
            <text x="56" y="30" fill="#047857" fontSize="10" className="font-bold">$</text>
            <text x="64" y="30" fill="#047857" fontSize="10" className="font-bold">$</text>
            <rect x="50" y="10" width="20" height="12" fill="#1e293b" />
            <ellipse cx="60" cy="22" rx="14" ry="2" fill="#1e293b" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center p-1 select-none pointer-events-none">
      {getStickerContent()}
    </div>
  );
};

// ======================== APP ========================

export default function App() {
  // ---- Core state ----
  const [view, setView] = useState<View>('auth');
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [user, setUser] = useState<User | null>(null);

  // ---- Auth form ----
  const [suName, setSuName] = useState('');
  const [suPass, setSuPass] = useState('');
  const [suPass2, setSuPass2] = useState('');
  const [siDuck, setSiDuck] = useState('');
  const [siPass, setSiPass] = useState('');
  const [authErr, setAuthErr] = useState('');

  // ---- Dashboard ----
  const [yellowCode, setYellowCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [joinError, setJoinError] = useState('');

  // ---- Chat ----
  const [, setChatRoom] = useState<{ roomId: string; secret: string } | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerName, setPeerName] = useState('');
  const [showCodeBanner, setShowCodeBanner] = useState(true);
  const [isCreator, setIsCreator] = useState(false);

  // ---- Chat UX States ----
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMsg | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  // ---- Typing states & refs ----
  const [peerTyping, setPeerTyping] = useState(false);
  const peerTypingTimeoutRef = useRef<any>(null);
  const localTypingTimeoutRef = useRef<any>(null);
  const isLocalTypingRef = useRef(false);

  // ---- Refs ----
  interface NtfyChannel {
    postMessage: (event: BCEvent) => Promise<void>;
    close: () => void;
  }
  const channelRef = useRef<NtfyChannel | null>(null);
  const secretRef = useRef('');
  const userRef = useRef<User | null>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { userRef.current = user; }, [user]);

  // ---- Scroll ----
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ==================== AUTH ====================

  const handleSignup = async () => {
    setAuthErr('');
    if (!suName.trim()) { setAuthErr('Choose a username'); return; }
    if (suName.trim().length < 2) { setAuthErr('Username needs at least 2 characters'); return; }
    if (!suPass) { setAuthErr('Choose a password'); return; }
    if (suPass.length < 4) { setAuthErr('Password needs at least 4 characters'); return; }
    if (suPass !== suPass2) { setAuthErr('Passwords don\'t match'); return; }

    const duckId = generateDuckId();
    const hash = await hashPassword(suPass);
    saveAccount({ username: suName.trim(), duckId, passwordHash: hash });

    const u: User = { username: suName.trim(), duckId };
    saveSession(u);
    setUser(u);
    setView('dashboard');
  };

  const handleSignin = async () => {
    setAuthErr('');
    const id = siDuck.trim().toUpperCase();
    if (!id) { setAuthErr('Enter your Duck ID'); return; }
    if (!siPass) { setAuthErr('Enter your password'); return; }

    const acc = findAccount(id);
    if (!acc) { setAuthErr('Duck ID not found — check your ID'); return; }

    const hash = await hashPassword(siPass);
    if (hash !== acc.passwordHash) { setAuthErr('Wrong password'); return; }

    const u: User = { username: acc.username, duckId: acc.duckId };
    saveSession(u);
    setUser(u);
    setView('dashboard');
  };

  const handleSignout = () => {
    if (channelRef.current) {
      try {
        channelRef.current.postMessage({
          type: 'leave', senderDuckId: userRef.current?.duckId || '',
          senderName: userRef.current?.username || '', timestamp: Date.now(),
        });
      } catch { /* ignore */ }
      channelRef.current.close();
      channelRef.current = null;
    }
    // Clear storage and refs
    sessionStorage.removeItem('ddy_active_chat');
    sessionStorage.removeItem('ddy_chat_messages');
    clearSession();
    setUser(null);
    setView('auth');
    setChatRoom(null);
    setMessages([]);
    setPeerTyping(false);
    if (peerTypingTimeoutRef.current) clearTimeout(peerTypingTimeoutRef.current);
    if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
    isLocalTypingRef.current = false;
    setYellowCode('');
    setJoinCode('');
  };

  // ==================== CHAT LOGIC ====================

  const joinRoom = useCallback((roomId: string, secret: string, creator: boolean) => {
    if (channelRef.current) {
      try { channelRef.current.close(); } catch { /* */ }
    }

    secretRef.current = secret;

    // Create EventSource to listen to incoming messages from ntfy.sh
    const es = new EventSource(`https://ntfy.sh/ddy-${roomId}/sse`);

    // Define the publish function
    const postMessage = async (event: BCEvent) => {
      try {
        await fetch(`https://ntfy.sh/ddy-${roomId}`, {
          method: 'POST',
          body: JSON.stringify(event),
          keepalive: true,
        });
      } catch (err) {
        console.error('Failed to publish to ntfy:', err);
      }
    };

    const channel: NtfyChannel = {
      postMessage,
      close: () => {
        es.close();
      }
    };

    channelRef.current = channel;

    setChatRoom({ roomId, secret });
    sessionStorage.setItem('ddy_active_chat', JSON.stringify({ roomId, secret, isCreator: creator }));

    // Load messages from sessionStorage if they exist, otherwise initialize as empty
    try {
      const storedMsgs = sessionStorage.getItem('ddy_chat_messages');
      if (storedMsgs) {
        setMessages(JSON.parse(storedMsgs));
      } else {
        setMessages([]);
        sessionStorage.setItem('ddy_chat_messages', '[]');
      }
    } catch {
      setMessages([]);
      sessionStorage.setItem('ddy_chat_messages', '[]');
    }

    setPeerOnline(false);
    setPeerName('');
    setPeerTyping(false); // Reset peer typing state on new room join
    setShowCodeBanner(creator);
    setIsCreator(creator);
    setView('chat');

    // Send initial join message
    const u = userRef.current;
    if (u) {
      postMessage({ type: 'join', senderDuckId: u.duckId, senderName: u.username, timestamp: Date.now() } satisfies BCEvent);
    }

    // Keep track of our current peerOnline state using a local variable so we can safely inspect it inside the async callback
    let currentPeerOnline = false;

    es.onmessage = async (ev: MessageEvent) => {
      try {
        const ntfyData = JSON.parse(ev.data);
        if (ntfyData.event !== 'message' || !ntfyData.message) {
          return; // Skip keepalive or other events
        }

        const d = JSON.parse(ntfyData.message) as BCEvent;
        const me = userRef.current;
        if (!me || d.senderDuckId === me.duckId) {
          return; // Ignore messages from ourselves
        }

        // Symmetrical/Self-healing peer connection:
        // If we receive ANY event from the peer, they are online!
        if (!currentPeerOnline) {
          setPeerOnline(true);
          currentPeerOnline = true;
          setPeerName(d.senderName);
          setShowCodeBanner(false);

          // We always send a join event when first connecting, whether they sent a join or any other event,
          // so that the peer also sets their peerOnline to true.
          postMessage({ type: 'join', senderDuckId: me.duckId, senderName: me.username, timestamp: Date.now() } satisfies BCEvent);
        }

        if (d.type === 'message' && d.payload) {
          try {
            const txt = await decryptMessage(d.payload, secretRef.current);
            let messageId = genId(); // Default fallback
            let decryptedText = txt;
            let replyToData = undefined;
            let stickerIdData = undefined;
            try {
              const parsed = JSON.parse(txt);
              if (parsed) {
                if (parsed.id) {
                  messageId = parsed.id;
                }
                if (typeof parsed.text === 'string' || parsed.stickerId) {
                  decryptedText = parsed.text || '';
                  replyToData = parsed.replyTo;
                  stickerIdData = parsed.stickerId;
                }
              }
            } catch {
              // Legacy plain text message
            }

            setMessages(p => {
              const updated = [...p, {
                id: messageId,
                text: decryptedText,
                isMine: false,
                timestamp: d.timestamp,
                senderName: d.senderName,
                replyTo: replyToData,
                stickerId: stickerIdData
              }];
              sessionStorage.setItem('ddy_chat_messages', JSON.stringify(updated));
              return updated;
            });
            // Clear peer typing state when a message is received
            setPeerTyping(false);
            if (peerTypingTimeoutRef.current) {
              clearTimeout(peerTypingTimeoutRef.current);
            }
          } catch (e) {
            console.error('Decryption failed:', e);
          }
        }
        if (d.type === 'reaction' && d.payload) {
          try {
            const txt = await decryptMessage(d.payload, secretRef.current);
            const react = JSON.parse(txt) as { messageId: string, emoji: string, senderDuckId: string, senderName: string };
            if (react && react.messageId && react.emoji) {
              setMessages(p => {
                const updated = p.map(m => {
                  if (m.id === react.messageId) {
                    const existingReactions = m.reactions || [];
                    const foundIndex = existingReactions.findIndex(
                      r => r.senderDuckId === react.senderDuckId && r.emoji === react.emoji
                    );
                    
                    let newReactions = [...existingReactions];
                    if (foundIndex > -1) {
                      newReactions.splice(foundIndex, 1);
                    } else {
                      newReactions.push({
                        senderDuckId: react.senderDuckId,
                        senderName: react.senderName,
                        emoji: react.emoji
                      });
                    }
                    return { ...m, reactions: newReactions };
                  }
                  return m;
                });
                sessionStorage.setItem('ddy_chat_messages', JSON.stringify(updated));
                return updated;
              });
            }
          } catch (e) {
            console.error('Failed to handle reaction event:', e);
          }
        }
        if (d.type === 'typing') {
          const isTyping = d.payload === 'true';
          setPeerTyping(isTyping);
          if (peerTypingTimeoutRef.current) {
            clearTimeout(peerTypingTimeoutRef.current);
          }
          if (isTyping) {
            // Failsafe timeout to automatically clear the indicator after 5 seconds
            peerTypingTimeoutRef.current = setTimeout(() => {
              setPeerTyping(false);
            }, 5000);
          }
        }
        if (d.type === 'leave') {
          setPeerOnline(false);
          currentPeerOnline = false;
          setPeerName('');
          setPeerTyping(false);
          if (peerTypingTimeoutRef.current) {
            clearTimeout(peerTypingTimeoutRef.current);
          }
        }
      } catch (err) {
        console.error('Error handling ntfy event:', err);
      }
    };

    es.onerror = (err) => {
      console.error('EventSource error:', err);
    };

  }, []);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!channelRef.current || !userRef.current || !peerOnline) return;

    const u = userRef.current;
    
    // Optimistically update our local state
    setMessages(p => {
      const updated = p.map(m => {
        if (m.id === messageId) {
          const existingReactions = m.reactions || [];
          const foundIndex = existingReactions.findIndex(
            r => r.senderDuckId === u.duckId && r.emoji === emoji
          );
          
          let newReactions = [...existingReactions];
          if (foundIndex > -1) {
            newReactions.splice(foundIndex, 1);
          } else {
            newReactions.push({
              senderDuckId: u.duckId,
              senderName: u.username,
              emoji: emoji
            });
          }
          return { ...m, reactions: newReactions };
        }
        return m;
      });
      sessionStorage.setItem('ddy_chat_messages', JSON.stringify(updated));
      return updated;
    });

    // Send the reaction event to the peer
    try {
      const payloadObj = {
        messageId,
        emoji,
        senderDuckId: u.duckId,
        senderName: u.username
      };
      const enc = await encryptMessage(JSON.stringify(payloadObj), secretRef.current);
      channelRef.current.postMessage({
        type: 'reaction',
        senderDuckId: u.duckId,
        senderName: u.username,
        payload: enc,
        timestamp: Date.now()
      } satisfies BCEvent);
    } catch (err) {
      console.error('Failed to send reaction:', err);
    }
  }, [peerOnline]);

  const sendSticker = useCallback(async (stickerId: string) => {
    if (!channelRef.current || !userRef.current || !peerOnline) return;
    
    const replyToData = replyingTo ? {
      id: replyingTo.id,
      text: replyingTo.text,
      senderName: replyingTo.senderName
    } : undefined;

    const messageId = genId();

    const payloadObj = {
      id: messageId,
      text: "",
      stickerId,
      replyTo: replyToData
    };

    const enc = await encryptMessage(JSON.stringify(payloadObj), secretRef.current);
    const u = userRef.current;
    
    channelRef.current.postMessage({
      type: 'message',
      senderDuckId: u.duckId,
      senderName: u.username,
      payload: enc,
      timestamp: Date.now(),
    } satisfies BCEvent);

    setMessages(p => {
      const updated = [...p, {
        id: messageId,
        text: "",
        stickerId,
        isMine: true,
        timestamp: Date.now(),
        senderName: u.username,
        replyTo: replyToData
      }];
      sessionStorage.setItem('ddy_chat_messages', JSON.stringify(updated));
      return updated;
    });

    setReplyingTo(null);
    setShowStickerPicker(false);
  }, [peerOnline, replyingTo]);

  const sendMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || !channelRef.current || !userRef.current) return;
    setChatInput('');

    // Clear local typing state immediately on send
    if (isLocalTypingRef.current) {
      isLocalTypingRef.current = false;
      if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
      channelRef.current.postMessage({
        type: 'typing',
        senderDuckId: userRef.current.duckId,
        senderName: userRef.current.username,
        payload: 'false',
        timestamp: Date.now(),
      } satisfies BCEvent);
    }

    const replyToData = replyingTo ? {
      id: replyingTo.id,
      text: replyingTo.text,
      senderName: replyingTo.senderName
    } : undefined;

    const messageId = genId();

    const payloadObj = {
      id: messageId,
      text,
      replyTo: replyToData
    };

    const enc = await encryptMessage(JSON.stringify(payloadObj), secretRef.current);
    const u = userRef.current;
    
    channelRef.current.postMessage({
      type: 'message',
      senderDuckId: u.duckId,
      senderName: u.username,
      payload: enc,
      timestamp: Date.now(),
    } satisfies BCEvent);

    setMessages(p => {
      const updated = [...p, {
        id: messageId,
        text,
        isMine: true,
        timestamp: Date.now(),
        senderName: u.username,
        replyTo: replyToData
      }];
      sessionStorage.setItem('ddy_chat_messages', JSON.stringify(updated));
      return updated;
    });

    setReplyingTo(null); // Clear the active reply quote
  }, [chatInput, replyingTo]);

  const leaveChat = useCallback(() => {
    if (channelRef.current) {
      const u = userRef.current;
      if (u) {
        try {
          channelRef.current.postMessage({ type: 'leave', senderDuckId: u.duckId, senderName: u.username, timestamp: Date.now() } satisfies BCEvent);
        } catch { /* */ }
      }
      channelRef.current.close();
      channelRef.current = null;
    }
    // Clear storage and refs
    sessionStorage.removeItem('ddy_active_chat');
    sessionStorage.removeItem('ddy_chat_messages');
    setChatRoom(null);
    setMessages([]);
    setPeerOnline(false);
    setPeerName('');
    setPeerTyping(false);
    if (peerTypingTimeoutRef.current) clearTimeout(peerTypingTimeoutRef.current);
    if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
    isLocalTypingRef.current = false;
    setYellowCode('');
    setView('dashboard');
  }, []);

  const handleCreateChat = () => {
    const { code, roomId, secret } = generateYellowCode();
    setYellowCode(code);
    setCopiedCode(false);
    joinRoom(roomId, secret, true);
  };

  const handleJoinChat = () => {
    setJoinError('');
    const parsed = parseYellowCode(joinCode);
    if (!parsed) { setJoinError('Invalid Yellow Code — check and try again'); return; }
    setYellowCode('');
    joinRoom(parsed.roomId, parsed.secret, false);
    setJoinCode('');
  };

  // ---- Init session & restore active chat ----
  useEffect(() => {
    const s = getSession();
    if (s) {
      setUser(s);
      
      const activeChatStr = sessionStorage.getItem('ddy_active_chat');
      if (activeChatStr) {
        try {
          const activeChat = JSON.parse(activeChatStr);
          joinRoom(activeChat.roomId, activeChat.secret, activeChat.isCreator);
          return;
        } catch (e) {
          console.error('Failed to parse active chat for restore:', e);
        }
      }
      setView('dashboard');
    }
  }, [joinRoom]);

  const hoverTimeoutRef = useRef<any>(null);

  const handleMessageMouseEnter = (msgId: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredMessageId(msgId);
  };

  const handleMessageMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredMessageId(null);
    }, 400); // 400ms delay to allow comfortably hovering over absolute buttons
  };

  // ---- Cleanup typing timers on unmount ----
  useEffect(() => {
    return () => {
      if (peerTypingTimeoutRef.current) clearTimeout(peerTypingTimeoutRef.current);
      if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const handleInputChange = (val: string) => {
    setChatInput(val);

    if (!peerOnline || !channelRef.current || !userRef.current) return;

    // Immediately signal "typing: false" if the input is cleared
    if (!val.trim()) {
      if (isLocalTypingRef.current) {
        isLocalTypingRef.current = false;
        if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
        channelRef.current.postMessage({
          type: 'typing',
          senderDuckId: userRef.current.duckId,
          senderName: userRef.current.username,
          payload: 'false',
          timestamp: Date.now(),
        } satisfies BCEvent);
      }
      return;
    }

    // Send typing: true if we haven't already signaled we are typing
    if (!isLocalTypingRef.current) {
      isLocalTypingRef.current = true;
      channelRef.current.postMessage({
        type: 'typing',
        senderDuckId: userRef.current.duckId,
        senderName: userRef.current.username,
        payload: 'true',
        timestamp: Date.now(),
      } satisfies BCEvent);
    }

    // Reset the debounce timeout
    if (localTypingTimeoutRef.current) {
      clearTimeout(localTypingTimeoutRef.current);
    }

    localTypingTimeoutRef.current = setTimeout(() => {
      if (isLocalTypingRef.current && channelRef.current && userRef.current) {
        isLocalTypingRef.current = false;
        channelRef.current.postMessage({
          type: 'typing',
          senderDuckId: userRef.current.duckId,
          senderName: userRef.current.username,
          payload: 'false',
          timestamp: Date.now(),
        } satisfies BCEvent);
      }
    }, 2500);
  };

  // ==================== RENDER ====================

  // -------- AUTH SCREEN --------
  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-400/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-yellow-400/3 rounded-full blur-[80px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10" style={{ animation: 'fadeInScale 0.5s ease-out' }}>
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <img 
              src={logoImg} 
              alt="Duck Duck Yellow Logo" 
              className="w-56 mx-auto mb-4 object-contain select-none pointer-events-none drop-shadow-[0_0_15px_rgba(245,158,11,0.15)]" 
              style={{ animation: 'waddle 2s ease-in-out infinite' }} 
            />
            <h1 className="sr-only text-3xl font-black tracking-tight">
              <span className="text-amber-400">Duck Duck</span>{' '}
              <span className="text-yellow-300">Yellow</span>
            </h1>
            <p className="text-gray-400/80 text-sm mt-2 font-medium tracking-wide">Quack securely. Leave no trace.</p>
          </div>

          {/* Card */}
          <div className="bg-gray-900/80 border border-amber-500/15 rounded-2xl p-6 backdrop-blur-sm shadow-2xl shadow-amber-900/10">
            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-800/60 rounded-xl p-1">
              <button
                onClick={() => { setAuthMode('signup'); setAuthErr(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  authMode === 'signup'
                    ? 'bg-amber-500 text-gray-900 shadow-lg shadow-amber-500/25'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <span className="material-symbols-rounded text-sm align-middle mr-1">person_add</span>
                Sign Up
              </button>
              <button
                onClick={() => { setAuthMode('signin'); setAuthErr(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  authMode === 'signin'
                    ? 'bg-amber-500 text-gray-900 shadow-lg shadow-amber-500/25'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <span className="material-symbols-rounded text-sm align-middle mr-1">login</span>
                Sign In
              </button>
            </div>

            {authMode === 'signup' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block flex items-center gap-1">
                    <span className="material-symbols-rounded text-xs text-gray-500">person</span>
                    Username
                  </label>
                  <input
                    value={suName} onChange={e => setSuName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSignup()}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                    placeholder="What should we call you?"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block flex items-center gap-1">
                    <span className="material-symbols-rounded text-xs text-gray-500">lock</span>
                    Password
                  </label>
                  <input
                    type="password" value={suPass} onChange={e => setSuPass(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSignup()}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                    placeholder="At least 4 characters"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block flex items-center gap-1">
                    <span className="material-symbols-rounded text-xs text-gray-500">lock</span>
                    Confirm Password
                  </label>
                  <input
                    type="password" value={suPass2} onChange={e => setSuPass2(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSignup()}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                    placeholder="Type it again"
                  />
                </div>
                <button
                  onClick={handleSignup}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold text-sm hover:shadow-lg hover:shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-rounded text-lg">how_to_reg</span>
                  Create Account
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block flex items-center gap-1">
                    <span className="material-symbols-rounded text-xs text-gray-500">badge</span>
                    Your Duck ID
                  </label>
                  <input
                    value={siDuck} onChange={e => setSiDuck(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSignin()}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all font-mono uppercase tracking-wider"
                    placeholder="DD-XXXX-XXXX"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block flex items-center gap-1">
                    <span className="material-symbols-rounded text-xs text-gray-500">lock</span>
                    Password
                  </label>
                  <input
                    type="password" value={siPass} onChange={e => setSiPass(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSignin()}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                    placeholder="Enter your password"
                  />
                </div>
                <button
                  onClick={handleSignin}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold text-sm hover:shadow-lg hover:shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-rounded text-lg">login</span>
                  Sign In
                </button>
              </div>
            )}

            {authErr && (
              <div className="mt-4 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center flex items-center justify-center gap-1.5">
                <span className="material-symbols-rounded text-sm">error</span>
                {authErr}
              </div>
            )}
          </div>

          {/* Footer info */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-5 text-[11px] text-gray-600">
              <span className="flex items-center gap-1">
                <span className="material-symbols-rounded text-xs text-amber-400/50">lock</span>
                AES-256-GCM
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-rounded text-xs text-amber-400/50">history</span>
                No history saved
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-rounded text-xs text-amber-400/50">visibility_off</span>
                Zero tracking
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------- DASHBOARD --------
  if (view === 'dashboard' && user) {
    return (
      <div className="min-h-screen bg-gray-950 relative overflow-hidden">
        {/* Background */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-amber-400/3 rounded-full blur-[150px] pointer-events-none" />

        {/* Header */}
        <header className="border-b border-gray-800/60 bg-gray-900/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={logoImg} 
                alt="Duck Duck Yellow Logo" 
                className="h-9 w-auto object-contain select-none pointer-events-none drop-shadow-[0_0_8px_rgba(245,158,11,0.1)]" 
                style={{ animation: 'waddle 3s ease-in-out infinite' }} 
              />
              <span className="font-black text-lg">
                <span className="text-amber-400">Duck Duck</span>{' '}
                <span className="text-yellow-300">Yellow</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs text-gray-400">{user.username}</span>
              </div>
              <button
                onClick={handleSignout}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10 flex items-center gap-1.5"
              >
                <span className="material-symbols-rounded text-sm">logout</span>
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="max-w-4xl mx-auto px-4 py-8 relative z-10">
          {/* Welcome */}
          <div className="text-center mb-8" style={{ animation: 'slideUp 0.4s ease-out' }}>
            <h2 className="text-2xl font-bold text-white mb-1">Welcome back, <span className="text-amber-400">{user.username}</span></h2>
            <p className="text-gray-500 text-sm">Your identity is your key. Share it wisely.</p>
          </div>

          {/* Duck ID Card */}
          <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border border-amber-500/15 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ animation: 'slideUp 0.5s ease-out' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center overflow-hidden border border-amber-500/20">
                <img 
                  src={logoImg} 
                  alt="Duck Duck Yellow" 
                  className="w-10 h-10 object-contain select-none pointer-events-none" 
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                  <span className="material-symbols-rounded text-[11px]">badge</span>
                  Your Private Duck ID
                </p>
                <p className="text-xl font-mono font-bold text-amber-400 tracking-widest">{user.duckId}</p>
              </div>
            </div>
            <button
              onClick={() => copyText(user.duckId)}
              className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-rounded text-sm">content_copy</span>
              Copy ID
            </button>
          </div>

          {/* Two action cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Create Chat */}
            <div className="p-6 rounded-2xl bg-gray-900/60 border border-gray-800/60 hover:border-amber-500/20 transition-all" style={{ animation: 'slideUp 0.6s ease-out' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <span className="material-symbols-rounded text-amber-400">vpn_key</span>
                </div>
                <div>
                  <h3 className="font-bold text-white">Start New Chat</h3>
                  <p className="text-[11px] text-gray-500">Generate a fresh Yellow Code</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Each chat uses a brand-new encryption key. Share the Yellow Code via paper, a different app, or any out-of-band method.
              </p>
              <button
                onClick={handleCreateChat}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold text-sm hover:shadow-lg hover:shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-rounded text-lg">add_circle</span>
                Generate Yellow Code
              </button>
            </div>

            {/* Join Chat */}
            <div className="p-6 rounded-2xl bg-gray-900/60 border border-gray-800/60 hover:border-emerald-500/20 transition-all" style={{ animation: 'slideUp 0.7s ease-out' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <span className="material-symbols-rounded text-emerald-400">chat</span>
                </div>
                <div>
                  <h3 className="font-bold text-white">Join a Chat</h3>
                  <p className="text-[11px] text-gray-500">Enter a Yellow Code to connect</p>
                </div>
              </div>
              <div className="space-y-3">
                <input
                  value={joinCode}
                  onChange={e => { setJoinCode(e.target.value); setJoinError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleJoinChat()}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono text-xs"
                  placeholder="Paste Yellow Code here..."
                />
                {joinError && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <span className="material-symbols-rounded text-sm">error</span>
                    {joinError}
                  </p>
                )}
                <button
                  onClick={handleJoinChat}
                  disabled={!joinCode.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-rounded text-lg">login</span>
                  Join Chat
                </button>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40" style={{ animation: 'slideUp 0.8s ease-out' }}>
            <h3 className="font-bold text-amber-400/80 mb-4 flex items-center gap-2 text-sm">
              <span className="material-symbols-rounded text-base">psychology</span>
              How Duck Duck Yellow Works
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 text-xs text-gray-500">
              <div className="flex gap-3">
                <span className="material-symbols-rounded text-lg text-amber-400/60 shrink-0">looks_one</span>
                <div>
                  <p className="text-gray-300 font-medium mb-0.5">Generate a Yellow Code</p>
                  <p>Creates a one-time encryption key for a new chat session.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="material-symbols-rounded text-lg text-amber-400/60 shrink-0">looks_two</span>
                <div>
                  <p className="text-gray-300 font-medium mb-0.5">Share It Out-of-Band</p>
                  <p>Write it on paper, send via email, or say it in person — anything untracked.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="material-symbols-rounded text-lg text-amber-400/60 shrink-0">looks_3</span>
                <div>
                  <p className="text-gray-300 font-medium mb-0.5">Chat with E2E Encryption</p>
                  <p>All messages are encrypted with AES-256-GCM. Nobody in the middle can read them.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="material-symbols-rounded text-lg text-amber-400/60 shrink-0">looks_4</span>
                <div>
                  <p className="text-gray-300 font-medium mb-0.5">Leave No Trace</p>
                  <p>When you close the chat, everything is gone. No history, no logs, no traces.</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800/40 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-gray-600">
              <span className="flex items-center gap-1">
                <span className="material-symbols-rounded text-xs text-amber-400/40">lock</span>
                AES-256-GCM Encryption
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-rounded text-xs text-amber-400/40">database_off</span>
                Zero Message Storage
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-rounded text-xs text-amber-400/40">vpn_key</span>
                One-Time Keys Per Chat
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-rounded text-xs text-amber-400/40">visibility_off</span>
                No Tracking Whatsoever
              </span>
            </div>
          </div>

          {/* Note */}
          <p className="text-center text-[11px] text-gray-700 mt-8">
            Open on another device or tab to test the real-time end-to-end encrypted connection.
          </p>
        </main>
      </div>
    );
  }

  // -------- CHAT SCREEN --------
  if (view === 'chat' && user) {
    return (
      <div className="h-screen bg-gray-950 flex flex-col relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-amber-400/3 rounded-full blur-[100px] pointer-events-none" />

        {/* Chat Header */}
        <header className="shrink-0 border-b border-gray-800/60 bg-gray-900/70 backdrop-blur-sm z-20">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="w-8 h-8 rounded-lg bg-gray-800/60 border border-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/60 transition-all shrink-0"
                title="Leave chat"
              >
                <span className="material-symbols-rounded text-lg">arrow_back</span>
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-sm truncate">
                    {peerOnline ? peerName : (isCreator ? 'Waiting for partner...' : 'Connecting...')}
                  </h3>
                  {peerOnline && (
                    <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[10px] text-green-400">Connected</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="material-symbols-rounded text-xs text-amber-400/60">lock</span>
                  <span className="text-[10px] text-gray-600">End-to-end encrypted · AES-256-GCM</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="px-3 py-1.5 rounded-lg text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/15 shrink-0 flex items-center gap-1.5"
            >
              <span className="material-symbols-rounded text-sm">call_end</span>
              <span className="hidden sm:inline">End Chat</span>
            </button>
          </div>
        </header>

        {/* Yellow Code Banner */}
        {showCodeBanner && yellowCode && (
          <div className="shrink-0 border-b border-amber-500/10 bg-amber-500/[0.03] z-10" style={{ animation: 'slideDown 0.3s ease-out' }}>
            <div className="max-w-3xl mx-auto px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-rounded text-amber-400 text-lg">vpn_key</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-amber-400/80 font-medium mb-1.5">Share this Yellow Code with your contact</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-black/30 border border-amber-500/10 text-[11px] text-amber-300/70 font-mono truncate select-all">
                      {yellowCode}
                    </code>
                    <button
                      onClick={() => { copyText(yellowCode); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }}
                      className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                        copiedCode
                          ? 'bg-green-500/20 text-green-400 border border-green-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/15 hover:bg-amber-500/20'
                      }`}
                    >
                      {copiedCode ? (
                        <><span className="material-symbols-rounded text-sm">check</span> Copied</>
                      ) : (
                        <><span className="material-symbols-rounded text-sm">content_copy</span> Copy</>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-rounded text-[11px]">info</span>
                    Send via paper, different app, or say it in person — anything untracked
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 relative z-10">
          <div className="max-w-3xl mx-auto space-y-3">
            {/* Waiting state */}
            {!peerOnline && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                <img 
                  src={logoImg} 
                  alt="Waiting..." 
                  className="w-40 h-auto mb-4 object-contain select-none pointer-events-none drop-shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
                  style={{ animation: 'float 3s ease-in-out infinite' }} 
                />
                <p className="text-gray-400 font-medium mb-1">
                  {isCreator ? 'Waiting for someone to join...' : 'Connecting...'}
                </p>
                <p className="text-xs text-gray-600 max-w-xs">
                  {isCreator
                    ? 'Share your Yellow Code via paper, email, or any out-of-band method'
                    : 'Verifying encryption keys...'}
                </p>
                {isCreator && (
                  <div className="mt-4 flex items-center gap-1">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-amber-400/40"
                        style={{ animation: `typing-dot 1.4s ease-in-out ${i * 0.2}s infinite` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
                style={{ animation: 'fadeIn 0.25s ease-out' }}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 relative group ${
                    msg.stickerId
                      ? 'bg-transparent border border-transparent'
                      : msg.isMine
                        ? 'bg-amber-500/15 border border-amber-500/20 rounded-br-md'
                        : 'bg-gray-800/60 border border-gray-700/40 rounded-bl-md'
                  }`}
                  onMouseEnter={() => handleMessageMouseEnter(msg.id)}
                  onMouseLeave={handleMessageMouseLeave}
                >
                  {/* Actions Quick Hover Menu */}
                  {peerOnline && hoveredMessageId === msg.id && (
                    <div 
                      className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 bg-gray-900 border border-gray-700/60 rounded-full px-2 py-1 shadow-xl z-30 scale-95 hover:scale-100 transition-all ${
                        msg.isMine ? 'right-full mr-2' : 'left-full ml-2'
                      }`}
                    >
                      {/* Quick Emojis */}
                      <div className="flex items-center gap-0.5 border-r border-gray-800 pr-1.5 mr-1">
                        {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(msg.id, emoji)}
                            className="hover:scale-125 transition-transform duration-100 text-sm select-none px-0.5"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      {/* Reply Button */}
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="w-5 h-5 rounded-full hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                        title="Reply to message"
                      >
                        <span className="material-symbols-rounded text-sm">reply</span>
                      </button>
                    </div>
                  )}

                  {/* Quoted Reply Block */}
                  {msg.replyTo && (
                    <div className="mb-2 bg-black/35 border-l-2 border-amber-500 rounded-r-lg px-2.5 py-1.5 text-left text-xs text-gray-400 flex flex-col gap-0.5 select-none">
                      <span className="font-bold text-[10px] text-amber-400">
                        {msg.replyTo.senderName === user?.username ? 'You' : msg.replyTo.senderName}
                      </span>
                      <span className="truncate">{msg.replyTo.text}</span>
                    </div>
                  )}

                  {!msg.isMine && (
                    <p className="text-[11px] font-medium text-emerald-400/70 mb-0.5">{msg.senderName}</p>
                  )}
                  {msg.stickerId ? (
                    <DuckSticker id={msg.stickerId} />
                  ) : (
                    <p className="text-sm text-gray-100 leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
                  )}
                  
                  {/* Reactions Pill Display */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 justify-start">
                      {Object.entries(
                        msg.reactions.reduce((acc, curr) => {
                          acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([emoji, count]) => {
                        const hasReacted = msg.reactions?.some(
                          r => r.senderDuckId === user?.duckId && r.emoji === emoji
                        );
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(msg.id, emoji)}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-all ${
                              hasReacted
                                ? 'bg-amber-500/20 border-amber-500/35 text-amber-300'
                                : 'bg-gray-950/40 border-gray-800 text-gray-400 hover:bg-gray-900/50'
                            }`}
                          >
                            <span>{emoji}</span>
                            {count > 1 && <span className="font-bold">{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <span className="text-[10px] text-gray-600">{fmtTime(msg.timestamp)}</span>
                    <span className="material-symbols-rounded text-xs text-amber-400/40">lock</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Peer typing indicator */}
            {peerOnline && peerTyping && (
              <div 
                className="flex justify-start"
                style={{ animation: 'fadeIn 0.2s ease-out' }}
              >
                <div className="max-w-[75%] rounded-2xl rounded-bl-sm px-4 py-2.5 bg-gray-800/40 border border-gray-700/30 flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium">
                    {peerName || 'Partner'} is typing
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-amber-400/80"
                        style={{ animation: `typing-dot 1.4s ease-in-out ${i * 0.2}s infinite` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Peer left notification */}
            {!peerOnline && messages.length > 0 && (
              <div className="text-center py-3">
                <span className="text-[11px] text-gray-600 bg-gray-800/40 px-3 py-1.5 rounded-full border border-gray-700/30 flex items-center gap-1 mx-auto w-fit">
                  <span className="material-symbols-rounded text-xs">person_remove</span>
                  {peerName ? `${peerName} left the chat` : 'Peer disconnected'}
                </span>
              </div>
            )}

            <div ref={msgEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="shrink-0 border-t border-gray-800/60 bg-gray-900/70 backdrop-blur-sm z-20">
          <div className="max-w-3xl mx-auto px-4">
            {/* Sticker Picker Tray */}
            {showStickerPicker && (
              <div 
                className="pt-4 pb-1 border-b border-gray-800/40 animate-slide-up"
                style={{ animation: 'slideUp 0.2s ease-out' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold select-none">
                    Select Animated Yellow Duck Sticker
                  </span>
                  <button
                    onClick={() => setShowStickerPicker(false)}
                    className="text-[10px] text-gray-500 hover:text-white transition-all"
                  >
                    Close
                  </button>
                </div>
                {/* Horizontal scrollable stickers list */}
                <div className="flex gap-4 overflow-x-auto py-2 scrollbar-thin scrollbar-thumb-amber-500/20">
                  {[
                    { id: 'duck_happy', label: 'Happy' },
                    { id: 'duck_cool', label: 'Cool' },
                    { id: 'duck_love', label: 'Love' },
                    { id: 'duck_code', label: 'Coding' },
                    { id: 'duck_sleep', label: 'Sleeping' },
                    { id: 'duck_shock', label: 'Shocked' },
                    { id: 'duck_cry', label: 'Weeping' },
                    { id: 'duck_rich', label: 'Rich' }
                  ].map(stk => (
                    <button
                      key={stk.id}
                      onClick={() => sendSticker(stk.id)}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-gray-950/40 border border-gray-800/50 hover:border-amber-500/30 hover:bg-gray-900/60 transition-all group shrink-0 active:scale-95"
                    >
                      <div className="w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <DuckSticker id={stk.id} size={55} />
                      </div>
                      <span className="text-[10px] font-medium text-gray-500 group-hover:text-amber-300">
                        {stk.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reply Quote Preview */}
            {replyingTo && (
              <div 
                className="pt-3 pb-1 flex items-start justify-between border-b border-gray-800/40 animate-slide-up"
                style={{ animation: 'slideUp 0.2s ease-out' }}
              >
                <div className="flex items-stretch gap-2.5 min-w-0 flex-1">
                  <div className="w-1 bg-amber-500 rounded-full" />
                  <div className="min-w-0 py-0.5">
                    <p className="text-[11px] font-bold text-amber-400">
                      Replying to {replyingTo.isMine ? 'yourself' : replyingTo.senderName}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{replyingTo.text}</p>
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="w-6 h-6 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white transition-all ml-2"
                >
                  <span className="material-symbols-rounded text-sm">close</span>
                </button>
              </div>
            )}

            <div className="py-3 flex gap-2">
              {/* Sticker Picker Trigger */}
              <button
                onClick={() => setShowStickerPicker(p => !p)}
                disabled={!peerOnline}
                className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all shrink-0 active:scale-95 ${
                  showStickerPicker
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700/60'
                }`}
                title="Send animated sticker"
              >
                <span className="material-symbols-rounded text-xl">sticky_note_2</span>
              </button>

              <input
                value={chatInput}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={peerOnline ? 'Type a message...' : 'Waiting for connection...'}
                disabled={!peerOnline}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all disabled:opacity-40"
              />
              <button
                onClick={sendMessage}
                disabled={!chatInput.trim() || !peerOnline}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold text-sm disabled:opacity-20 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-amber-500/25 active:scale-95 transition-all shrink-0 flex items-center justify-center"
              >
                <span className="material-symbols-rounded text-xl">send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Custom Confirmation Modal */}
        {showLeaveConfirm && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in"
            style={{ animation: 'fadeInScale 0.25s ease-out' }}
          >
            <div className="bg-gray-900 border border-amber-500/20 max-w-sm w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              {/* Decorative Warning Glow */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="text-center relative z-10">
                {/* Warning Icon */}
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-rounded text-amber-500 text-2xl">warning</span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">End Secure Chat?</h3>
                <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                  This will immediately end the secure session and permanently delete all messages in this conversation. This action cannot be undone.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 text-xs font-semibold hover:bg-gray-700/60 active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowLeaveConfirm(false);
                      leaveChat();
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white text-xs font-semibold hover:shadow-lg hover:shadow-red-500/25 active:scale-95 transition-all"
                  >
                    End Chat & Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------- FALLBACK --------
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <img 
          src={logoImg} 
          alt="Loading..." 
          className="w-32 h-auto mb-4 object-contain select-none pointer-events-none drop-shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
          style={{ animation: 'waddle 2s ease-in-out infinite' }} 
        />
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
}
