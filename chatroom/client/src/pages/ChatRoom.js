import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Picker from 'emoji-picker-react';
import { FaTrashAlt } from 'react-icons/fa';
import CallPopup from '../components/CallPopup';

// Lightweight KSC symbol to brand the chat (no external assets needed)
function KSCMark({ size = 36 }) {
  return (
    <div
      className="rounded-full bg-gradient-to-br from-[#00ffff] to-[#ff00ff] shadow-[0_0_12px_rgba(255,0,255,0.65)] ring-1 ring-white/20 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <span
        className="text-black font-extrabold tracking-wider"
        style={{ fontSize: Math.max(12, size * 0.33) }}
      >
        KSC
      </span>
    </div>
  );
}

function ChatRoom() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  // --- Video call additions ---
  const [showCallOptions, setShowCallOptions] = useState(false);
  const [callType, setCallType] = useState('audio'); // 'audio' or 'video'
  const peerRef = useRef();
  const localAudioRef = useRef();
  const remoteAudioRef = useRef();
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [currentCallPeer, setCurrentCallPeer] = useState(null);

  // Load messages
  const handleLoadMessages = useCallback((messages) => {
    setChat(messages);
  }, []);

  // Handle incoming chat or file message
  const handleIncomingMessage = useCallback((msg) => {
    setChat((prev) => [...prev, msg]);
  }, []);

  // Handle deleted message
  const handleDeletedMessage = useCallback((messageId) => {
    setChat((prev) => prev.filter((msg) => msg._id !== messageId));
  }, []);

  // Handle file upload
  const handleFileUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const messageData = {
        sender: username,
        content: JSON.stringify({
          name: file.name,
          type: file.type,
          data: reader.result,
        }),
        type: 'file',
      };
      socketRef.current.emit('chatFile', messageData);
    };
    reader.readAsDataURL(file);
  };

  // End call logic
  const endCall = useCallback(() => {
    setInCall(false);
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localAudioRef.current && localAudioRef.current.srcObject) {
      localAudioRef.current.srcObject.getTracks().forEach(track => track.stop());
      localAudioRef.current.srcObject = null;
    }
    if (remoteAudioRef.current && remoteAudioRef.current.srcObject) {
      remoteAudioRef.current.srcObject.getTracks().forEach(track => track.stop());
      remoteAudioRef.current.srcObject = null;
    }
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      remoteVideoRef.current.srcObject = null;
    }
    if (currentCallPeer) {
      socketRef.current.emit('end-call', { targetId: currentCallPeer });
    }
    setCurrentCallPeer(null);
  }, [currentCallPeer]);

  // --- AUDIO CALL ---
  const startCall = async (targetUsername) => {
    try {
      setInCall(true);
      setCurrentCallPeer(targetUsername);
      setCallType('audio');
      peerRef.current = new window.RTCPeerConnection();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localAudioRef.current.srcObject = stream;
      stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));

      peerRef.current.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current.emit('ice-candidate', { targetId: targetUsername, candidate: e.candidate });
        }
      };

      peerRef.current.ontrack = (e) => {
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0];
      };

      const offer = await peerRef.current.createOffer();
      await peerRef.current.setLocalDescription(offer);

      socketRef.current.emit('call-user', { targetId: targetUsername, offer, caller: username, isVideo: false });
    } catch (err) {
      alert('Could not start call: ' + err.message);
      setInCall(false);
      setCurrentCallPeer(null);
    }
  };

  // --- VIDEO CALL ---
  const startVideoCall = async (targetUsername) => {
    try {
      setInCall(true);
      setCurrentCallPeer(targetUsername);
      setCallType('video');
      peerRef.current = new window.RTCPeerConnection();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localAudioRef.current.srcObject = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));

      peerRef.current.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current.emit('ice-candidate', { targetId: targetUsername, candidate: e.candidate });
        }
      };

      peerRef.current.ontrack = (e) => {
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0];
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      };

      const offer = await peerRef.current.createOffer();
      await peerRef.current.setLocalDescription(offer);

      socketRef.current.emit('call-user', { targetId: targetUsername, offer, caller: username, isVideo: true });
    } catch (err) {
      alert('Could not start video call: ' + err.message);
      setInCall(false);
      setCurrentCallPeer(null);
    }
  };

  // Show popup on incoming call
  const handleIncomingCall = useCallback(({ from, offer, caller, isVideo }) => {
    setIncomingCall({ from, offer, caller, isVideo });
  }, []);

  // Accept call from popup
  const acceptCall = async () => {
    if (!incomingCall) return;
    setInCall(true);
    setCurrentCallPeer(incomingCall.from);
    setCallType(incomingCall.isVideo ? 'video' : 'audio');
    setIncomingCall(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.isVideo ? true : false
      });
      localAudioRef.current.srcObject = stream;
      if (incomingCall.isVideo && localVideoRef.current) localVideoRef.current.srcObject = stream;
      peerRef.current = new window.RTCPeerConnection();

      stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));

      peerRef.current.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current.emit('ice-candidate', { targetId: incomingCall.from, candidate: e.candidate });
        }
      };

      peerRef.current.ontrack = (e) => {
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0];
        if (incomingCall.isVideo && remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      };

      await peerRef.current.setRemoteDescription(new window.RTCSessionDescription(incomingCall.offer));
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      socketRef.current.emit('answer-call', { targetId: incomingCall.from, answer });
    } catch (err) {
      alert('Could not answer call: ' + err.message);
      setInCall(false);
      setCurrentCallPeer(null);
    }
  };

  // Reject call from popup
  const rejectCall = () => {
    if (incomingCall) {
      socketRef.current.emit('reject-call', { targetId: incomingCall.from });
      setIncomingCall(null);
    }
  };

  // Listen for call rejection on caller side
  useEffect(() => {
    if (!socketRef.current) return;
    socketRef.current.on('call-rejected', () => {
      endCall();
      alert('Call was rejected.');
    });
    return () => {
      if (socketRef.current) socketRef.current.off('call-rejected');
    };
  }, [endCall]);

  // When call is answered, open local audio and add tracks
  const handleCallAnswered = async ({ answer }) => {
    if (peerRef.current) {
      await peerRef.current.setRemoteDescription(new window.RTCSessionDescription(answer));
      try {
        if (!localAudioRef.current.srcObject) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === 'video'
          });
          localAudioRef.current.srcObject = stream;
          if (callType === 'video' && localVideoRef.current) localVideoRef.current.srcObject = stream;
          stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));
        }
      } catch (err) {
        alert('Could not open microphone: ' + err.message);
        endCall();
      }
    }
  };

  const handleICECandidate = async ({ candidate }) => {
    try {
      if (peerRef.current) {
        await peerRef.current.addIceCandidate(new window.RTCIceCandidate(candidate));
      }
    } catch (e) {
      console.error('ICE Error:', e);
    }
  };

  // Listen for end-call event
  useEffect(() => {
    if (!socketRef.current) return;
    socketRef.current.on('end-call', () => {
      endCall();
      alert('The other user ended the call.');
    });
    return () => {
      if (socketRef.current) socketRef.current.off('end-call');
    };
  }, [endCall]);

  // Listen for real-time online users (ALWAYS use latest username from state)
  useEffect(() => {
    if (!socketRef.current) return;
    const handleOnlineUsers = (users) => {
      const uname = (username || '').trim().toLowerCase();
      const filtered = users.filter(u => (u || '').trim().toLowerCase() !== uname);
      setConnectedUsers(filtered);
    };
    socketRef.current.on('online-users', handleOnlineUsers);
    return () => {
      if (socketRef.current) socketRef.current.off('online-users', handleOnlineUsers);
    };
  }, [username]);

  // Socket connection and listeners
  useEffect(() => {
    const token = localStorage.getItem('token');
    const uname = (localStorage.getItem('username') || '').trim();
    const userRole = localStorage.getItem('role');

    // If username is not set, redirect to login
    if (!token || !uname) {
      navigate('/');
      return;
    }

    setUsername(uname);
    setRole(userRole);

    socketRef.current = io('https://chatroom1-6.onrender.com', { autoConnect: false });
    socketRef.current.connect();

    socketRef.current.on('connect', () => {
      socketRef.current.emit('register-user', uname);
    });

    socketRef.current.on('loadMessages', handleLoadMessages);
    socketRef.current.on('chatMessage', handleIncomingMessage);
    socketRef.current.on('chatFile', handleIncomingMessage);
    socketRef.current.on('deleteMessage', handleDeletedMessage);
    socketRef.current.on('incoming-call', handleIncomingCall);
    socketRef.current.on('call-answered', handleCallAnswered);
    socketRef.current.on('ice-candidate', handleICECandidate);

    return () => {
      socketRef.current.disconnect();
    };
    // eslint-disable-next-line
  }, [handleIncomingMessage, handleLoadMessages, handleDeletedMessage, navigate, handleIncomingCall]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  // Send chat message
  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (!socketRef.current.connected) return;
    const chatMessage = { sender: username, content: message.trim(), type: 'text' };
    socketRef.current.emit('chatMessage', chatMessage);
    setMessage('');
  };

  // Delete message
  const deleteMessage = (messageId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      socketRef.current.emit('deleteMessage', messageId);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  // Emoji picker
  const onEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col relative bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#0b1020]">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_60%_at_20%_20%,rgba(255,0,255,0.15),transparent),radial-gradient(40%_40%_at_80%_0%,rgba(0,255,255,0.12),transparent)]" />

      <div className="relative mx-auto w-full max-w-none sm:max-w-5xl px-0 sm:px-4 py-0 sm:py-6 flex-1 sm:flex-none">
        <div className="flex flex-col h-[100dvh] sm:h-[85vh] sm:rounded-2xl sm:border border-white/10 sm:bg-white/5 bg-transparent backdrop-blur-md sm:shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-white/10 bg-white/10 sm:bg-white/5 backdrop-blur">
            <div className="flex items-center gap-3">
              <KSCMark size={36} />
              <div className="leading-tight">
                <div className="text-white text-xl font-semibold">KSC Chat</div>
                <div className="text-white/60 text-xs">Secure realtime chat</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {role === 'admin' && (
                <button
                  onClick={() => navigate('/admin-dashboard')}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white px-4 py-2 text-sm shadow hover:opacity-90 active:scale-[0.98] ring-1 ring-white/10"
                >
                  Admin
                </button>
              )}
              <button
                onClick={() => { setShowCallOptions(true); setCallType('audio'); }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-teal-500 text-black px-4 py-2 text-sm shadow ring-1 ring-white/10 hover:opacity-90 active:scale-[0.98]"
              >
                📞 Call
              </button>
              <button
                onClick={() => { setShowCallOptions(true); setCallType('video'); }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 text-black px-4 py-2 text-sm shadow ring-1 ring-white/10 hover:opacity-90 active:scale-[0.98]"
              >
                🎥 Video
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-red-600 text-white px-4 py-2 text-sm shadow hover:opacity-90 active:scale-[0.98] ring-1 ring-white/10"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 sm:h-[65vh] sm:overflow-y-auto overflow-y-auto p-3 sm:p-4 bg-transparent sm:bg-white/5">
            {chat.map((msg, i) => {
              const isMe = msg.sender === username;
              const isAdmin = role === 'admin';
              const canDelete = isMe || isAdmin;
              let fileData = null;

              if (msg.type === 'file') {
                try {
                  fileData = JSON.parse(msg.content);
                } catch {}
              }

              return (
                <div key={msg._id || `${msg.sender}-${msg.timestamp}-${i}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3`}>
                  <div
                    className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-2xl px-4 py-3 shadow-md ring-1 ring-white/10 ${
                      isMe
                        ? 'bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white'
                        : 'bg-white/80 text-gray-900'
                    }`}
                  >
                    <div className={`text-xs mb-1 ${isMe ? 'text-white/80' : 'text-gray-600'} font-semibold`}>
                      {msg.sender}
                    </div>
                    {msg.type === 'file' && fileData ? (
                      fileData.type?.startsWith('image/') ? (
                        <img src={fileData.data} alt="shared" className="mt-1 rounded-lg max-h-48 sm:max-h-64 object-contain" />
                      ) : fileData.type?.startsWith('video/') ? (
                        <video controls className="mt-1 rounded-lg max-h-48 sm:max-h-64">
                          <source src={fileData.data} type={fileData.type} />
                        </video>
                      ) : (
                        <a
                          href={fileData.data}
                          download={fileData.name}
                          className={`mt-1 block underline ${isMe ? 'text-white' : 'text-blue-700'}`}
                        >
                          📄 {fileData.name}
                        </a>
                      )
                    ) : (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</div>
                    )}
                    <div className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-gray-500'}`}>
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                    {canDelete && msg._id && (
                      <button
                        onClick={() => deleteMessage(msg._id)}
                        className={`absolute -top-2 -right-2 inline-flex items-center justify-center h-7 w-7 rounded-full bg-white/80 text-gray-800 shadow ring-1 ring-black/10 hover:bg-white ${isMe ? '' : ''}`}
                        title="Delete message"
                      >
                        <FaTrashAlt size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef}></div>
          </div>

          {/* Composer */}
          <div className="sticky bottom-0 sm:sticky sm:bottom-0 z-20 border-t border-white/10 bg-white/10 sm:bg-white/5 backdrop-blur sm:backdrop-blur px-4 py-3">
            <form onSubmit={sendMessage} className="relative flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 rounded-full bg-white/10 backdrop-blur px-3 py-2 ring-1 ring-white/10 shadow-inner">
                <label htmlFor="fileInput" className="cursor-pointer shrink-0">
                  <span className="sr-only">Attach file</span>
                  <img src="/clip-icon.png" alt="Attach" className="w-5 h-5 opacity-80 hover:opacity-100" />
                  <input id="fileInput" type="file" className="hidden" accept=".pdf,image/*,video/*" onChange={(e) => handleFileUpload(e.target.files[0])} />
                </label>
                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-xl px-1 focus:outline-none">
                  😊
                </button>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent outline-none text-white placeholder-white/50 text-sm"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2 text-sm shadow ring-1 ring-white/10 hover:opacity-90 active:scale-[0.98]"
              >
                Send
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-14 left-2 sm:left-10 right-2 z-50 max-w-[calc(100vw-1rem)] overflow-hidden drop-shadow-xl">
                  <Picker onEmojiClick={onEmojiClick} />
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Call options modal */}
      {showCallOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCallOptions(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-white/10 p-4 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Start Personal {callType === 'video' ? 'Video' : 'Audio'} Call</div>
              <button onClick={() => setShowCallOptions(false)} className="text-white/70 hover:text-white">✖</button>
            </div>
            {connectedUsers.length === 0 && (
              <div className="text-white/80">No users online to call.</div>
            )}
            <div className="max-h-80 overflow-y-auto divide-y divide-white/10">
              {connectedUsers.map((user, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (callType === 'video') {
                      startVideoCall(user);
                    } else {
                      startCall(user);
                    }
                    setShowCallOptions(false);
                  }}
                  className="w-full text-left py-2 px-2 hover:bg-white/10 rounded-md"
                >
                  {callType === 'video' ? '🎥 Video Call' : '📞 Call'} {user}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mini video screens during video call */}
      {inCall && callType === 'video' && (
        <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-50 flex gap-3 flex-wrap bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-2 shadow-lg">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-white/70 mb-1">You</span>
            <video ref={localVideoRef} autoPlay muted className="rounded-lg bg-black/60 w-28 h-20 sm:w-40 sm:h-28" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-white/70 mb-1">Remote</span>
            <video ref={remoteVideoRef} autoPlay className="rounded-lg bg-black/60 w-28 h-20 sm:w-40 sm:h-28" />
          </div>
        </div>
      )}

      {/* Audio elements for call (keep for both audio and video calls) */}
      <div className="sr-only">
        <audio ref={localAudioRef} autoPlay muted={false} />
        <audio ref={remoteAudioRef} autoPlay />
      </div>

      {inCall && (
        <button
          onClick={endCall}
          className="fixed bottom-2 left-2 sm:bottom-4 sm:left-4 z-50 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-red-600 text-white px-4 py-2 text-sm shadow ring-1 ring-white/10 hover:opacity-90 active:scale-[0.98]"
        >
          End Call
        </button>
      )}

      {incomingCall && (
        <CallPopup caller={incomingCall.caller} onAccept={acceptCall} onReject={rejectCall} />
      )}
    </div>
  );
}

export default ChatRoom;
