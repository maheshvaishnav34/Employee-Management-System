import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare, Send, Globe, Users, Clock, HelpCircle,
  RefreshCw, Circle, User
} from 'lucide-react';
import { SkeletonBlock } from '../components/Skeleton';

const Chat = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeContact, setActiveContact] = useState({ id: 'global', name: 'Global Announcements', isGlobal: true });
  const [messageText, setMessageText] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  
  const messagesEndRef = useRef(null);

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true);
      const res = await api.get('/chat/users');
      if (res.success) setContacts(res.users);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingContacts(false);
    }
  };

  const fetchMessages = async (contact) => {
    if (!contact) return;
    try {
      const qs = contact.isGlobal 
        ? '?isGlobal=true' 
        : `?recipientId=${contact.id}`;
      const res = await api.get(`/chat/messages${qs}`);
      if (res.success) setMessages(res.messages);
    } catch (e) {
      console.error('Error loading chat messages:', e);
    }
  };

  // Initial load
  useEffect(() => {
    fetchContacts();
  }, []);

  // Poll messages every 4 seconds
  useEffect(() => {
    setLoadingMessages(true);
    fetchMessages(activeContact).then(() => setLoadingMessages(false));

    const interval = setInterval(() => {
      fetchMessages(activeContact);
    }, 4000);

    return () => clearInterval(interval);
  }, [activeContact]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    try {
      const payload = {
        message: messageText.trim(),
        isGlobal: activeContact.isGlobal,
        recipientId: activeContact.isGlobal ? null : activeContact.id
      };
      
      setMessageText('');
      const res = await api.post('/chat/messages', payload);
      if (res.success) {
        // Append sent message to local list for snappy UI
        setMessages(prev => [...prev, res.message]);
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const getContactInitials = (c) => {
    if (c.isGlobal) return 'G';
    if (c.employee) return `${c.employee.firstName[0]}${c.employee.lastName[0]}`.toUpperCase();
    return c.username.slice(0, 2).toUpperCase();
  };

  return (
    <div className="page-container page-enter" style={{ height: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(236,72,153,0.3)',
        }}>
          <MessageSquare size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Team Chat & Messenger</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Connect and direct message with colleagues or broadcast to the Global Channel.
          </p>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="card" style={{ flex: 1, display: 'flex', padding: 0, overflow: 'hidden', minHeight: '400px' }}>
        {/* Left contacts list */}
        <div style={{
          width: '300px', borderRight: '1px solid var(--border-color)', display: 'flex',
          flexDirection: 'column', height: '100%'
        }}>
          <div style={{
            padding: '1.25rem', borderBottom: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
          }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Active Chats</span>
            <button className="btn btn-secondary btn-icon" onClick={fetchContacts} style={{ width: '28px', height: '28px' }} title="Sync contacts">
              <RefreshCw size={12} />
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
            {/* Global Channel Button */}
            <div
              onClick={() => setActiveContact({ id: 'global', name: 'Global Announcements', isGlobal: true })}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                borderRadius: '10px', cursor: 'pointer', marginBottom: '0.5rem',
                background: activeContact.isGlobal ? 'var(--bg-sidebar-active)' : 'transparent',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => { if(!activeContact.isGlobal) e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
              onMouseLeave={e => { if(!activeContact.isGlobal) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
              }}>
                <Globe size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: activeContact.isGlobal ? 'var(--text-sidebar-active)' : 'var(--text-primary)' }}>
                  Global Channel
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Announcements</span>
              </div>
            </div>

            <div style={{ margin: '1rem 0.5rem 0.5rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Direct Messages
            </div>

            {/* Direct Messages Contact list */}
            {loadingContacts ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[0, 1, 2].map(i => (
                  <SkeletonBlock key={i} height="48px" borderRadius="10px" />
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <p style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center' }}>
                No active contacts found.
              </p>
            ) : (
              contacts.map(c => {
                const isActive = !activeContact.isGlobal && activeContact.id === c._id;
                const contactName = c.employee ? `${c.employee.firstName} ${c.employee.lastName}` : c.username;
                const isOnline = c.employee?.status === 'Active';
                
                return (
                  <div
                    key={c._id}
                    onClick={() => setActiveContact({ id: c._id, name: contactName, isGlobal: false })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                      borderRadius: '10px', cursor: 'pointer', marginBottom: '0.25rem',
                      background: isActive ? 'var(--bg-sidebar-active)' : 'transparent',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => { if(!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
                    onMouseLeave={e => { if(!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                        fontSize: '0.8rem', fontWeight: 700
                      }}>
                        {getContactInitials(c)}
                      </div>
                      {isOnline && (
                        <div style={{
                          position: 'absolute', bottom: '1px', right: '1px', width: '9px', height: '9px',
                          borderRadius: '50%', background: '#2ebd7f', border: '1.5px solid var(--bg-secondary)'
                        }} />
                      )}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{
                        fontWeight: 700, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        color: isActive ? 'var(--text-sidebar-active)' : 'var(--text-primary)'
                      }}>
                        {contactName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {c.role}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right message space */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(0,0,0,0.01)' }}>
          {/* Active Contact info Header */}
          <div style={{
            padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0
          }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: activeContact.isGlobal ? '#ec4899' : '#6777ef'
            }} />
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{activeContact.name}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
              {activeContact.isGlobal ? 'Global Broadcast Channel' : 'Direct Conversation'}
            </span>
          </div>

          {/* Messages Logs Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {loadingMessages && messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <SkeletonBlock height="40px" width="45%" style={{ alignSelf: 'flex-start' }} />
                <SkeletonBlock height="40px" width="30%" style={{ alignSelf: 'flex-end' }} />
                <SkeletonBlock height="40px" width="55%" style={{ alignSelf: 'flex-start' }} />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Globe size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.85rem' }}>Send a message to start conversation!</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isOwn = msg.sender?._id === user?._id || msg.sender === user?._id;
                
                // Fetch display name
                let senderName = msg.sender?.username || 'User';
                
                return (
                  <div key={msg._id || index} style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: isOwn ? 'flex-end' : 'flex-start',
                    maxWidth: '75%',
                    alignSelf: isOwn ? 'flex-end' : 'flex-start'
                  }}>
                    {!isOwn && activeContact.isGlobal && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '2px', marginLeft: '6px' }}>
                        {senderName}
                      </span>
                    )}
                    <div style={{
                      padding: '0.75rem 1rem',
                      borderRadius: isOwn ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      background: isOwn ? 'var(--primary-gradient)' : 'var(--bg-secondary)',
                      color: isOwn ? 'white' : 'var(--text-primary)',
                      boxShadow: 'var(--shadow-sm)',
                      border: isOwn ? 'none' : '1px solid var(--border-color)',
                      fontSize: '0.88rem',
                      lineHeight: 1.4,
                      wordBreak: 'break-word'
                    }}>
                      {msg.message}
                    </div>
                    <span style={{
                      fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px',
                      marginRight: isOwn ? '4px' : '0', marginLeft: isOwn ? '0' : '4px'
                    }}>
                      {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Send Input Panel */}
          <form onSubmit={handleSendMessage} style={{
            padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)', display: 'flex', gap: '0.75rem', flexShrink: 0
          }}>
            <input
              type="text"
              className="form-control"
              placeholder={`Send message to ${activeContact.isGlobal ? 'Global channel' : activeContact.name}...`}
              style={{ flex: 1, borderRadius: '12px' }}
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{
              width: '42px', height: '42px', padding: 0, borderRadius: '12px',
              background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Send size={18} color="white" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
