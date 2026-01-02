import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import './Messages.css';
import { getCSRFToken } from '../../utils/csrf';
import { useI18n } from '../../context/I18nContext';

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
  const { t } = useI18n();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [drafts, setDrafts] = useState({});
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState('');
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const messagesListRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    // Snap directly to the latest message after messages load/change
    if (!loadingMessages && messagesListRef.current) {
      messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
    }
  }, [messages, loadingMessages, selectedConversation]);

  useEffect(() => {
    return () => {
      if (attachmentPreview) {
        URL.revokeObjectURL(attachmentPreview);
      }
    };
  }, [attachmentPreview]);

  const fetchConversations = async () => {
    setLoadingConversations(true);
    try {
      const response = await fetch('/api/conversations/', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(t('messages.loadConversationsError', 'Failed to load conversations'));
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

  const mediaMessages = useMemo(
    () => messages.filter((msg) => msg.has_attachment),
    [messages]
  );

  const selectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setShowMediaPanel(false);
    setIsBlocked(!!conversation.is_blocked);
    setBlockMessage(conversation.is_blocked ? t('messages.blocked', 'You blocked this user. Messaging is disabled.') : '');
    setAttachment(null);
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
      setAttachmentPreview('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setNewMessage(drafts[conversation.conversation_id] || '');
    await fetchMessages(conversation.conversation_id);
  };

  const fetchMessages = async (conversationId) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages/`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(t('messages.loadMessagesError', 'Failed to load messages'));
      }
      const data = await response.json();
      setMessages(data);
      // If the API signals block via serializer, keep it in sync.
      const convoMeta = conversations.find((c) => c.conversation_id === conversationId);
      if (convoMeta?.is_blocked) {
        setIsBlocked(true);
        setBlockMessage(t('messages.blocked', 'You blocked this user. Messaging is disabled.'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  const reorderConversations = (updatedConversation) => {
    setConversations((prev) => {
      const mapped = prev.map((convo) =>
        convo.conversation_id === updatedConversation.conversation_id ? updatedConversation : convo
      );
      return mapped.sort((a, b) => {
        const aTime = new Date(a.last_message_at || a.created_at).getTime();
        const bTime = new Date(b.last_message_at || b.created_at).getTime();
        return bTime - aTime;
      });
    });
  };

  const handleDraftChange = (value) => {
    setNewMessage(value);
    if (selectedConversation) {
      setDrafts((prev) => ({
        ...prev,
        [selectedConversation.conversation_id]: value,
      }));
    }
  };

  const handleAttachmentChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAttachment(null);
      if (attachmentPreview) {
        URL.revokeObjectURL(attachmentPreview);
        setAttachmentPreview('');
      }
      return;
    }
    setAttachment(file);
    if (file.type?.startsWith('image/')) {
      if (attachmentPreview) {
        URL.revokeObjectURL(attachmentPreview);
      }
      setAttachmentPreview(URL.createObjectURL(file));
    } else if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
      setAttachmentPreview('');
    } else {
      setAttachmentPreview('');
    }
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
      setAttachmentPreview('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation) {
      return;
    }
    if (isBlocked) {
        setError(blockMessage || 'Messaging is disabled.');
        return;
    }
    if (!newMessage.trim() && !attachment) {
      return;
    }

    try {
      const csrfToken = getCSRFToken();
      const formData = new FormData();
      formData.append('message_text', newMessage);
      if (attachment) {
        formData.append('attachment', attachment);
      }

      const response = await fetch(
        `/api/conversations/${selectedConversation.conversation_id}/messages/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'X-CSRFToken': csrfToken || '',
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          const message =
            errorData.error ||
            'Messaging is disabled because one of you has blocked the other.';
          setIsBlocked(true);
          setBlockMessage(message);
          throw new Error(message);
        }
        throw new Error(errorData.error || 'Failed to send message');
      }

      const message = await response.json();
      setMessages((prev) => [...prev, message]);
      setNewMessage('');
      clearAttachment();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[selectedConversation.conversation_id];
        return next;
      });
      const updatedConversation = selectedConversation
        ? {
            ...selectedConversation,
            last_message: message,
            last_message_at: message.sent_at,
          }
        : selectedConversation;
      if (updatedConversation) {
        setSelectedConversation(updatedConversation);
        reorderConversations(updatedConversation);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="messages-page">
      <div className="conversation-list">
        <h2>{t('messages.title', 'Messages')}</h2>
        {loadingConversations ? (
          <p>{t('general.loading', 'Loading...')}</p>
        ) : conversations.length === 0 ? (
          <p>{t('messages.emptyList', 'No conversations yet.')}</p>
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
                      <Link to={`/profile/${convo.partner.id}`}>
                        {convo.partner.first_name || convo.partner.username}
                      </Link>
                    </div>
                    {convo.last_message ? (
                      <p className="preview">
                        {convo.last_message.has_attachment
                          ? convo.last_message.attachment_type === 'image'
                            ? t('messages.image', '[Image]')
                            : t('messages.file', '[File]')
                          : convo.last_message.message_text || t('messages.new', 'New message')}
                      </p>
                    ) : (
                      <p className="preview muted">{t('messages.noneYet', 'No messages yet')}</p>
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
                  <Link to={`/profile/${selectedConversation.partner.id}`}>
                    {selectedConversation.partner.first_name || selectedConversation.partner.username}
                  </Link>
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
              <button
                type="button"
                className="shared-media-button"
                onClick={() => setShowMediaPanel((prev) => !prev)}
              >
                {t('messages.sharedMedia', 'Shared Media')} ({mediaMessages.length})
              </button>
            </div>

            {showMediaPanel && (
              <div className="shared-media-panel">
                {mediaMessages.length === 0 ? (
                  <p className="muted">{t('messages.noShared', 'No shared files yet.')}</p>
                ) : (
                  <>
                    <div className="media-grid">
                      {mediaMessages
                        .filter((msg) => msg.attachment_type === 'image')
                        .map((msg) => (
                          <a
                            key={`${msg.message_id}-image`}
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="media-thumb"
                          >
                            <img src={msg.attachment_url} alt="Shared" />
                          </a>
                        ))}
                    </div>
                    <div className="media-files">
                      {mediaMessages
                        .filter((msg) => msg.attachment_type !== 'image')
                        .map((msg) => (
                          <a
                            key={`${msg.message_id}-file`}
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="media-file-link"
                          >
                            {msg.attachment_name || t('messages.download', 'Download file')}
                          </a>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {isBlocked && (
              <div className="block-banner">
                <p>{blockMessage || t('messages.blockedInfo', 'Messaging is disabled because one of you has blocked the other.')}</p>
              </div>
            )}

            <div className="messages-list" ref={messagesListRef}>
              {loadingMessages ? (
                <p>{t('messages.loading', 'Loading messages...')}</p>
              ) : messages.length === 0 ? (
                <p className="muted">{t('messages.empty', 'Say hello to start the conversation.')}</p>
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
                      {msg.attachment_url && (
                        <div className="bubble-attachment">
                          {msg.attachment_type === 'image' ? (
                            <img src={msg.attachment_url} alt={msg.attachment_name || 'Attachment'} />
                          ) : (
                            <a href={msg.attachment_url} target="_blank" rel="noreferrer">
                              {msg.attachment_name || t('messages.download', 'Download file')}
                            </a>
                          )}
                        </div>
                      )}
                      {msg.message_text && <p>{msg.message_text}</p>}
                      <span>{new Date(msg.sent_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="message-input">
              <div className="attachment-controls">
                <button
                  type="button"
                  className="attach-button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Attach
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden-file-input"
                  onChange={handleAttachmentChange}
                />
                {attachment && (
                  <div className="attachment-preview">
                    {attachmentPreview ? (
                      <img src={attachmentPreview} alt="Preview" />
                    ) : (
                      <span>{attachment.name}</span>
                    )}
                    <button type="button" onClick={clearAttachment}>
                      ×
                    </button>
                  </div>
                )}
              </div>
              <textarea
                rows={2}
                placeholder={t('messages.newMessage', 'Type a message...')}
                value={newMessage}
                onChange={(e) => handleDraftChange(e.target.value)}
                disabled={isBlocked}
              />
              <button
                onClick={handleSendMessage}
                disabled={isBlocked || (!newMessage.trim() && !attachment)}
              >
                {t('messages.send', 'Send')}
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <h3>{t('messages.selectConversation', 'Select a conversation')}</h3>
            <p>{t('messages.selectConversationDesc', 'Choose someone from the list to start chatting.')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Messages;
