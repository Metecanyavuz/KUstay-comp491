import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import './Messages.css';
import { getCSRFToken } from '../../utils/csrf';

function PartnerAvatar({ partner, size = 40 }) {
  const [error, setError] = useState(false);
  const initials = (
    partner.first_name?.[0] ??
    partner.last_name?.[0] ??
    partner.username?.[0] ??
    partner.email?.[0] ??
    '?'
  ).toUpperCase();

  const hasPhoto = partner.profile_photo_url && !error;

  return (
    <div
      className={`partner-avatar ${hasPhoto ? 'has-photo' : ''}`}
      style={{ width: size, height: size }}
    >
      {hasPhoto ? (
        <img
          src={partner.profile_photo_url}
          alt={`${partner.first_name || 'User'}'s avatar`}
          onError={() => setError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function Messages() {
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const messagesListRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    // Snap directly to the latest message after messages load/change
    if (!loadingMessages && messagesListRef.current) {
      messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
    }
  }, [messages, loadingMessages, selectedConversation]);

  const fetchConversations = async () => {
    setLoadingConversations(true);
    try {
      const response = await fetch('/api/conversations/', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load conversations');
      }
      const data = await response.json();
      setConversations(data);
      if (data.length > 0) {
        const params = new URLSearchParams(location.search);
        const openId = Number(params.get('open'));
        const target =
          Number.isFinite(openId) && openId > 0
            ? data.find((convo) => convo.conversation_id === openId)
            : null;
        if (target) {
          selectConversation(target);
        } else {
          selectConversation(data[0]);
        }
      } else {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingConversations(false);
    }
  };

  const selectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    await fetchMessages(conversation.conversation_id);
  };

  const fetchMessages = async (conversationId) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages/`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) {
      return;
    }

    try {
      const csrfToken = getCSRFToken();
      const response = await fetch(
        `/api/conversations/${selectedConversation.conversation_id}/messages/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken || '',
          },
          body: JSON.stringify({ message_text: newMessage }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const message = await response.json();
      setMessages((prev) => [...prev, message]);
      setNewMessage('');
      setSelectedConversation((prev) => ({ ...prev, last_message: message }));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="messages-page">
      <div className="conversation-list">
        <h2>Conversations</h2>
        {loadingConversations ? (
          <p>Loading...</p>
        ) : conversations.length === 0 ? (
          <p>No conversations yet.</p>
        ) : (
          <ul>
            {conversations.map((convo) => (
              <li
                key={convo.conversation_id}
                className={
                  selectedConversation?.conversation_id === convo.conversation_id
                    ? 'active'
                    : ''
                }
                onClick={() => selectConversation(convo)}
              >
                <div className="conversation-meta">
                  <PartnerAvatar partner={convo.partner} size={44} />
                  <div className="conversation-text">
                    <div className="partner-name">
                      {convo.partner.first_name || convo.partner.username}
                    </div>
                    {convo.last_message ? (
                      <p className="preview">{convo.last_message.message_text}</p>
                    ) : (
                      <p className="preview muted">No messages yet</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="conversation-panel">
        {error && <p className="error">{error}</p>}
        {selectedConversation ? (
          <>
            <div className="conversation-header">
              <PartnerAvatar partner={selectedConversation.partner} size={48} />
              <div>
                <h2>
                  {selectedConversation.partner.first_name || selectedConversation.partner.username}
                  {selectedConversation.partner.is_verified && (
                    <span className="verification-icon" title="Verified KU Student">
                      <CheckCircle size={16} />
                    </span>
                  )}
                </h2>
                {selectedConversation.partner.email && (
                  <p className="header-sub">{selectedConversation.partner.email}</p>
                )}
              </div>
            </div>

            <div className="messages-list" ref={messagesListRef}>
              {loadingMessages ? (
                <p>Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="muted">Say hello to start the conversation.</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.message_id}
                    className={`message-bubble ${msg.is_own ? 'own' : ''}`}
                  >
                    {!msg.is_own && selectedConversation?.partner && (
                      <PartnerAvatar partner={selectedConversation.partner} size={32} />
                    )}
                    <div className="bubble-content">
                      <p>{msg.message_text}</p>
                      <span>{new Date(msg.sent_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="message-input">
              <textarea
                rows={2}
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <h3>Select a conversation</h3>
            <p>Choose someone from the list to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Messages;
