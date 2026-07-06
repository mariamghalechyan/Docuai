import { useState, useEffect, useRef } from 'react'
import { getDocuments, uploadDocument, getDocument, getFields, getFlags, getChat, sendChat, deleteDocument } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');"

const INK = '#1E2530'
const PAPER = '#FBF9F3'
const MANILA = '#EFE9DA'
const MUTED = '#8A8471'
const LINE = '#DAD3BF'
const YELLOW = '#FFCE45'
const RED = '#C0392B'
const RED_BG = '#FBEAE7'
const GREEN = '#3F7A5C'
const GREEN_BG = '#E7F0EA'

const SEV_COLOR = { high: RED, medium: '#A9752E', low: GREEN }
const SEV_BG = { high: RED_BG, medium: '#FBF1E2', low: GREEN_BG }

function Stamp({ status }) {
  const map = {
    done: { label: 'PROCESSED', color: GREEN },
    error: { label: 'FAILED', color: RED },
    pending: { label: 'PENDING', color: MUTED },
    processing: { label: 'IN PROGRESS', color: '#A9752E' },
  }
  const s = map[status] || map.pending
  return (
    <span style={{
      display: 'inline-block', border: `1.5px solid ${s.color}`, color: s.color,
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 500,
      letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 3,
      transform: 'rotate(-2deg)', whiteSpace: 'nowrap', flexShrink: 0
    }}>
      {s.label}
    </span>
  )
}

function DocList({ docs, selected, onSelect, onDelete }) {
  if (docs.length === 0) return (
    <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: MUTED, fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>◇</div>
      <div>No files in this drawer</div>
      <div style={{ fontSize: 11, marginTop: 6, opacity: 0.8 }}>upload a PDF or DOCX to begin</div>
    </div>
  )
  return docs.map(doc => (
    <div key={doc.id} onClick={() => onSelect(doc)} style={{
      padding: '13px 1.1rem', cursor: 'pointer', borderBottom: `1px solid ${LINE}`,
      background: selected?.id === doc.id ? '#F3EEDD' : PAPER,
      borderLeft: selected?.id === doc.id ? `3px solid ${INK}` : '3px solid transparent'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{doc.filename}</div>
        <Stamp status={doc.status} />
        <button onClick={(e) => onDelete(e, doc.id)} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 14, padding: '0 2px', flexShrink: 0 }}>✕</button>
      </div>
      <div style={{ fontSize: 11, color: MUTED, marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>{doc.file_type?.toUpperCase()} · {new Date(doc.uploaded_at).toLocaleDateString()}</div>
    </div>
  ))
}

function DocDetail({ doc, fields }) {
  if (!doc) return <EmptyPane text="Select a file to inspect its contents" />
  return (
    <div style={{ padding: '1.5rem', overflowY: 'auto', height: '100%' }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: INK, marginBottom: 2 }}>{doc.filename}</div>
      <div style={{ marginBottom: 18 }}><Stamp status={doc.status} /></div>

      {doc.status === 'error' && (
        <div style={{ background: RED_BG, borderLeft: `3px solid ${RED}`, borderRadius: 3, padding: '11px 13px', fontSize: 13, color: '#9A3226', fontFamily: "'IBM Plex Mono', monospace" }}>
          ⚠ {doc.error_message || 'Unknown error'}
        </div>
      )}
      {doc.status !== 'done' && doc.status !== 'error' && (
        <div style={{ background: '#FBF1E2', borderLeft: '3px solid #A9752E', borderRadius: 3, padding: '11px 13px', fontSize: 13, color: '#7A5720', fontFamily: "'IBM Plex Mono', monospace" }}>
          Reading document — this can take a minute…
        </div>
      )}

      {doc.ai_summary && (
        <>
          <SectionLabel>Summary</SectionLabel>
          <div style={{ fontSize: 14, color: '#2B3340', lineHeight: 1.65, fontFamily: "'Inter', sans-serif" }}>{doc.ai_summary}</div>
        </>
      )}

      {fields.length > 0 && (
        <>
          <SectionLabel>Extracted fields</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {fields.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: MUTED, minWidth: 130, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {f.field_name.replace(/_/g, ' ')}
                </span>
                <span style={{
                  fontSize: 13.5, color: INK, fontWeight: 500, background: `linear-gradient(transparent 60%, ${YELLOW}88 60%)`,
                  padding: '0 2px'
                }}>
                  {f.field_value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: MUTED, marginBottom: 10, marginTop: 22, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${LINE}`, paddingBottom: 6 }}>
      {children}
    </div>
  )
}

function EmptyPane({ text }) {
  return <div style={{ padding: '2rem', color: MUTED, fontSize: 13, textAlign: 'center', marginTop: '3rem', fontFamily: "'IBM Plex Mono', monospace" }}>{text}</div>
}

function Chat({ docId, docReady }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    if (!docId) return
    setMessages([])
    getChat(docId).then(r => setMessages(r.data)).catch(() => {})
  }, [docId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim() || sending || !docReady) return
    const q = input.trim()
    setInput('')
    setSending(true)
    setMessages(m => [...m, { id: Date.now(), role: 'user', content: q }])
    try {
      const res = await sendChat(docId, q)
      setMessages(m => [...m, res.data])
    } catch (err) {
      const msg = err.response?.data?.detail || 'Sorry, something went wrong.'
      setMessages(m => [...m, { id: Date.now() + 1, role: 'assistant', content: msg }])
    }
    setSending(false)
  }

  if (!docId) return <EmptyPane text="Select a file to start a conversation" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && <EmptyPane text={docReady ? 'Ask anything about this document' : 'Still processing…'} />}
        {messages.map((m, i) => (
          <div key={m.id || i} style={{
            padding: '9px 13px', borderRadius: 3, fontSize: 13.5, lineHeight: 1.55, maxWidth: '88%',
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            background: m.role === 'user' ? INK : MANILA,
            color: m.role === 'user' ? PAPER : INK,
            fontFamily: "'Inter', sans-serif"
          }}>
            <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", opacity: 0.65, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {m.role === 'user' ? 'You' : 'DocuAI'}
            </div>
            {m.content}
          </div>
        ))}
        {sending && <div style={{ fontSize: 12, color: MUTED, fontFamily: "'IBM Plex Mono', monospace", alignSelf: 'flex-start' }}>thinking…</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: 12, borderTop: `1px solid ${LINE}`, display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={docReady ? 'Ask about this document…' : 'Processing…'} disabled={!docReady || sending}
          style={{ flex: 1, padding: '10px 13px', borderRadius: 3, border: `1px solid ${LINE}`, fontSize: 13.5, outline: 'none', fontFamily: "'Inter', sans-serif", background: PAPER }} />
        <button onClick={send} disabled={sending || !docReady} style={{
          padding: '10px 16px', borderRadius: 3, background: INK, color: PAPER, border: 'none',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          opacity: (!docReady || sending) ? 0.45 : 1
        }}>Send</button>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [docs, setDocs] = useState([])
  const [selected, setSelected] = useState(null)
  const [fields, setFields] = useState([])
  const [flags, setFlags] = useState([])
  const [uploading, setUploading] = useState(false)
  const [tab, setTab] = useState('chat')
  const pollRef = useRef()

  useEffect(() => {
    if (!user) { navigate('/'); return }
    loadDocs()
    return () => clearInterval(pollRef.current)
  }, [user])

  const loadDocs = async () => {
    try { const r = await getDocuments(); setDocs(r.data) } catch {}
  }

  const selectDoc = async (doc) => {
    clearInterval(pollRef.current)
    setSelected(doc)
    setFields([]); setFlags([])
    if (doc.status === 'done') {
      loadDocDetails(doc.id)
    } else {
      pollRef.current = setInterval(async () => {
        try {
          const r = await getDocument(doc.id)
          setSelected(r.data)
          setDocs(d => d.map(x => x.id === doc.id ? r.data : x))
          if (r.data.status === 'done' || r.data.status === 'error') {
  clearInterval(pollRef.current)
  if (r.data.status === 'done') loadDocDetails(doc.id)
}
        } catch {}
      }, 3000)
    }
  }

  const loadDocDetails = async (id) => {
    try {
      const [f, fl] = await Promise.all([getFields(id), getFlags(id)])
      setFields(f.data); setFlags(fl.data)
    } catch {}
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const r = await uploadDocument(file)
      setDocs(d => [r.data, ...d])
      selectDoc(r.data)
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.detail || err.message))
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (e, docId) => {
    e.stopPropagation()
    if (!confirm('Delete this document?')) return
    try {
      await deleteDocument(docId)
      setDocs(d => d.filter(x => x.id !== docId))
      if (selected?.id === docId) { setSelected(null); setFields([]); setFlags([]) }
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.detail || err.message))
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', sans-serif", fontSize: 14, color: INK, overflow: 'hidden', background: MANILA }}>
      <style>{FONT_IMPORT}</style>

      {/* Sidebar */}
      <div style={{ width: 230, background: MANILA, borderRight: `1px solid ${LINE}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '1.25rem 1.1rem 1rem' }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600, color: INK }}>DocuAI</div>
          <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: MUTED, letterSpacing: '0.08em', marginTop: 2 }}>DOCUMENT INTELLIGENCE</div>
        </div>
        <div style={{ padding: '0 1.1rem 8px' }}>
          <label style={{
            display: 'block', padding: '10px 12px', background: INK, color: PAPER, borderRadius: 3,
            fontSize: 13, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', textAlign: 'center',
            opacity: uploading ? 0.6 : 1
          }}>
            {uploading ? 'Uploading…' : '+ Upload document'}
            <input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
          </label>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ padding: '14px 1.1rem', borderTop: `1px solid ${LINE}` }}>
          <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace" }}>{user?.email}</div>
          <button onClick={() => { logout(); navigate('/') }} style={{ background: 'none', border: 'none', color: MUTED, fontSize: 12.5, cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 2 }}>Sign out</button>
        </div>
      </div>

      {/* Document list */}
      <div style={{ width: 270, borderRight: `1px solid ${LINE}`, display: 'flex', flexDirection: 'column', background: PAPER, flexShrink: 0 }}>
        <div style={{ padding: '13px 1.1rem', borderBottom: `1px solid ${LINE}`, fontSize: 11, fontWeight: 500, color: MUTED, fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {docs.length} File{docs.length !== 1 ? 's' : ''} on record
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <DocList docs={docs} selected={selected} onSelect={selectDoc} onDelete={handleDelete} />
        </div>
      </div>

      {/* Document detail */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${LINE}`, overflow: 'hidden', minWidth: 0, background: PAPER }}>
        <div style={{ padding: '13px 1.1rem', borderBottom: `1px solid ${LINE}`, fontSize: 13, fontWeight: 500, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selected ? selected.filename : 'No file selected'}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <DocDetail doc={selected} fields={fields} />
        </div>
      </div>

      {/* Chat + flags panel */}
      <div style={{ width: 350, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden', background: PAPER }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${LINE}`, flexShrink: 0 }}>
          {['chat', 'flags'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '12px', background: 'none', border: 'none',
              borderBottom: tab === t ? `2px solid ${INK}` : '2px solid transparent',
              color: tab === t ? INK : MUTED, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              {t === 'flags' ? `Risk notes${flags.length > 0 ? ` (${flags.length})` : ''}` : 'Chat'}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {tab === 'chat'
            ? <Chat docId={selected?.id} docReady={selected?.status === 'done'} />
            : (
              <div style={{ padding: '1.1rem', overflowY: 'auto', height: '100%' }}>
                {flags.length === 0
                  ? <EmptyPane text={selected ? (selected.status === 'done' ? 'No risks noted on this file' : 'Still processing…') : 'Select a file'} />
                  : flags.map(f => (
                    <div key={f.id} style={{
                      background: SEV_BG[f.severity] || MANILA, borderRadius: 3, padding: '11px 13px', marginBottom: 10,
                      borderLeft: `3px solid ${SEV_COLOR[f.severity] || MUTED}`, position: 'relative'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: SEV_COLOR[f.severity], fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.03em' }}>{f.flag_type.replace(/_/g, ' ')}</span>
                        <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 2, border: `1px solid ${SEV_COLOR[f.severity]}`, color: SEV_COLOR[f.severity], fontFamily: "'IBM Plex Mono', monospace" }}>{f.severity}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: '#2B3340', lineHeight: 1.55, fontFamily: "'Inter', sans-serif" }}>{f.description}</div>
                    </div>
                  ))
                }
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}
