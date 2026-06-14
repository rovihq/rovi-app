import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const COLORS = {
  green: '#0F6E56', teal: '#5DCAA5', dark: '#1C1C1A',
  dark2: '#2C2C2A', border: '#E2E0D8', text2: '#5F5E5A',
  text3: '#A8A8A2', green3: '#E8F7F1', bg2: '#F0EDE6'
}

export default function ChatPanel({ isOpen, onClose, contacts }) {
  const { profile } = useAuth()
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [unreadCounts, setUnreadCounts] = useState({})
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (profile?.id) {
      fetchConversations()
    }
  }, [profile?.id])

  useEffect(() => {
    if (!activeConversation) return
    fetchMessages(activeConversation.id)
    markMessagesRead(activeConversation.id)

    const channel = supabase
      .channel(`messages:${activeConversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConversation.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
        if (payload.new.sender_id !== profile.id) {
          markMessagesRead(activeConversation.id)
        }
        scrollToBottom()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [activeConversation?.id])

  useEffect(() => { scrollToBottom() }, [messages])

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const fetchConversations = async () => {
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        participant_1_profile:profiles!conversations_participant_1_fkey(id, full_name, role, company_name),
        participant_2_profile:profiles!conversations_participant_2_fkey(id, full_name, role, company_name)
      `)
      .or(`participant_1.eq.${profile.id},participant_2.eq.${profile.id}`)
      .order('last_message_at', { ascending: false })

    setConversations(data || [])

    if (data?.length) {
      const counts = {}
      for (const conv of data) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_id', profile.id)
        counts[conv.id] = count || 0
      }
      setUnreadCounts(counts)
    }
  }

  const fetchMessages = async (conversationId) => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(full_name, role)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  const markMessagesRead = async (conversationId) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', profile.id)
    fetchConversations()
  }

  const startOrOpenConversation = async (contactId) => {
    const existing = conversations.find(c =>
      (c.participant_1 === profile.id && c.participant_2 === contactId) ||
      (c.participant_2 === profile.id && c.participant_1 === contactId)
    )

    if (existing) {
      setActiveConversation(existing)
      return
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        participant_1: profile.id,
        participant_2: contactId,
        last_message: '',
        last_message_at: new Date().toISOString()
      })
      .select(`
        *,
        participant_1_profile:profiles!conversations_participant_1_fkey(id, full_name, role, company_name),
        participant_2_profile:profiles!conversations_participant_2_fkey(id, full_name, role, company_name)
      `)
      .single()

    if (!error && data) {
      setConversations(prev => [data, ...prev])
      setActiveConversation(data)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || sending) return
    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')

    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConversation.id,
      sender_id: profile.id,
      content,
      is_read: false
    })

    if (!error) {
      await supabase.from('conversations').update({
        last_message: content,
        last_message_at: new Date().toISOString()
      }).eq('id', activeConversation.id)
      fetchConversations()
    }
    setSending(false)
    inputRef.current?.focus()
  }

  const getOtherParticipant = (conv) => {
    if (conv.participant_1 === profile.id) return conv.participant_2_profile
    return conv.participant_1_profile
  }

  const getRoleColor = (role) => {
    if (role === 'supplier') return { bg: '#E8F7F1', color: '#085041' }
    if (role === 'rep') return { bg: '#EEEDFE', color: '#3C3489' }
    return { bg: '#FAEEDA', color: '#633806' }
  }

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '380px',
      background: 'white', borderLeft: `0.5px solid ${COLORS.border}`,
      display: 'flex', flexDirection: 'column', zIndex: 800,
      boxShadow: '-4px 0 24px rgba(0,0,0,0.08)', fontFamily: 'DM Sans, sans-serif'
    }}>
      {/* HEADER */}
      <div style={{ padding: '16px 20px', borderBottom: `0.5px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: COLORS.dark }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#F0EDE6' }}>Messages</div>
          {totalUnread > 0 && <div style={{ fontSize: '11px', color: COLORS.teal }}>{totalUnread} unread</div>}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {activeConversation && (
            <button onClick={() => { setActiveConversation(null); setMessages([]) }}
              style={{ background: 'transparent', border: 'none', color: '#888780', cursor: 'pointer', fontSize: '12px' }}>
              ← Back
            </button>
          )}
          <button onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#888780', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>
            ×
          </button>
        </div>
      </div>

      {!activeConversation ? (
        <>
          {/* CONTACTS */}
          {contacts?.length > 0 && (
            <div style={{ padding: '12px 16px', borderBottom: `0.5px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '10px', fontWeight: '500', color: COLORS.text3, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Start a conversation</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {contacts.map(c => {
                  const rc = getRoleColor(c.role)
                  return (
                    <div key={c.id} onClick={() => startOrOpenConversation(c.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', background: COLORS.bg2 }}
                      onMouseOver={e => e.currentTarget.style.background = COLORS.green3}
                      onMouseOut={e => e.currentTarget.style.background = COLORS.bg2}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: rc.bg, color: rc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>
                        {c.full_name?.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '500', color: COLORS.dark }}>{c.full_name}</div>
                        <div style={{ fontSize: '10px', color: COLORS.text3 }}>{c.company_name} · {c.role}</div>
                      </div>
                      <span style={{ marginLeft: 'auto', fontSize: '16px', color: COLORS.text3 }}>+</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* CONVERSATION LIST */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '12px 16px 6px', fontSize: '10px', fontWeight: '500', color: COLORS.text3, letterSpacing: '1px', textTransform: 'uppercase' }}>Recent conversations</div>
            {conversations.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: COLORS.text3, fontSize: '13px' }}>
                No conversations yet.<br />Start one above.
              </div>
            ) : conversations.map(conv => {
              const other = getOtherParticipant(conv)
              const unread = unreadCounts[conv.id] || 0
              const rc = getRoleColor(other?.role)
              return (
                <div key={conv.id} onClick={() => setActiveConversation(conv)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: `0.5px solid ${COLORS.border}`, cursor: 'pointer', background: unread > 0 ? '#FAFAF7' : 'white' }}
                  onMouseOver={e => e.currentTarget.style.background = COLORS.green3}
                  onMouseOut={e => e.currentTarget.style.background = unread > 0 ? '#FAFAF7' : 'white'}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: rc.bg, color: rc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>
                    {other?.full_name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: unread > 0 ? '600' : '500', color: COLORS.dark }}>{other?.full_name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.last_message || 'No messages yet'}</div>
                  </div>
                  {unread > 0 && (
                    <span style={{ background: COLORS.green, color: 'white', fontSize: '10px', fontWeight: '600', padding: '2px 6px', borderRadius: '20px', flexShrink: 0 }}>{unread}</span>
                  )}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <>
          {/* CONVERSATION HEADER */}
          {(() => {
            const other = getOtherParticipant(activeConversation)
            const rc = getRoleColor(other?.role)
            return (
              <div style={{ padding: '12px 16px', borderBottom: `0.5px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: rc.bg, color: rc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600' }}>
                  {other?.full_name?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.dark }}>{other?.full_name}</div>
                  <div style={{ fontSize: '11px', color: COLORS.text3 }}>{other?.company_name} · {other?.role}</div>
                </div>
              </div>
            )
          })()}

          {/* MESSAGES */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: COLORS.text3, fontSize: '13px', marginTop: '40px' }}>No messages yet — say hello!</div>
            ) : messages.map(msg => {
              const isMe = msg.sender_id === profile.id
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '75%', padding: '10px 13px',
                    borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: isMe ? COLORS.green : COLORS.bg2,
                    color: isMe ? 'white' : COLORS.dark, fontSize: '13px', lineHeight: '1.5'
                  }}>
                    {msg.content}
                    <div style={{ fontSize: '10px', color: isMe ? 'rgba(255,255,255,0.6)' : COLORS.text3, marginTop: '4px', textAlign: 'right' }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <div style={{ padding: '12px 16px', borderTop: `0.5px solid ${COLORS.border}`, display: 'flex', gap: '8px' }}>
            <input
              ref={inputRef}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type a message..."
              style={{ flex: 1, padding: '10px 12px', border: `0.5px solid ${COLORS.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
            />
            <button onClick={sendMessage} disabled={!newMessage.trim() || sending}
              style={{ padding: '10px 16px', background: newMessage.trim() ? COLORS.green : COLORS.border, color: newMessage.trim() ? 'white' : COLORS.text3, border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: newMessage.trim() ? 'pointer' : 'not-allowed' }}>
              Send
            </button>
          </div>
        </>
      )}
    </div>
  )
}
