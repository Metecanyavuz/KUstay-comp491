import { useEffect, useState } from 'react';
import './Messages.css';
import { getCSRFToken } from '../../utils/csrf';

function Messages() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConversations();
  }, []);

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
        selectConversation(data[0]);
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
                <div className="partner-name">
                  {convo.partner.first_name || convo.partner.username}
                </div>
                {convo.last_message ? (
                  <p className="preview">{convo.last_message.message_text}</p>
                ) : (
                  <p className="preview muted">No messages yet</p>
                )}
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
              <h2>
                {selectedConversation.partner.first_name || selectedConversation.partner.username}
              </h2>
            </div>

            <div className="messages-list">
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
