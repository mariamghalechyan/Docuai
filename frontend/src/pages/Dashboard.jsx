import { useState, useEffect, useRef } from 'react'
import { getDocuments, uploadDocument, getDocument, getFields, getFlags, getChat, sendChat, deleteDocument } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const SEV_COLOR = { high: '#a32d2d', medium: '#854f0b', low: '#3b6d11' }
const SEV_BG = { high: '#fcebeb', medium: '#faeeda', low: '#eaf3de' }

function DocList({ docs, selected, onSelect, onDelete }) {
  if (docs.length === 0) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#888780', fontSize: 13 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
      <div>No documents yet</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>Upload a PDF or DOCX to get started</div>
    </div>
  )
  return docs.map(doc => (
    <div key={doc.id} onClick={() => onSelect(doc)} style={{ padding: '12px 1rem', cursor: 'pointer', borderBottom: '0.5px solid #e5e4de', background: selected?.id === doc.id ? '#eeedfe' : 'white', borderLeft: selected?.id === doc.id ? '2px solid #534ab7' : '2px solid transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{doc.filename}</div>
        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: doc.status === 'done' ? '#eaf3de' : doc.status === 'error' ? '#fcebeb' : '#faeeda', color: doc.status === 'done' ? '#3b6d11' : doc.status === 'error' ? '#a32d2d' : '#854f0b', whiteSpace: 'nowrap', flexShrink: 0 }}>{doc.status}</span>
        <button onClick={(e) => onDelete(e, doc.id)} style={{ background: 'none', border: 'none', color: '#888780', cursor: 'pointer', fontSize: 14, padding: '0 2px', flexShrink: 0 }}>✕</button>
      </div>
      <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>{doc.file_type?.toUpperCase()} · {new Date(doc.uploaded_at).toLocaleDateString()}</div>
    </div>
  ))
}

function DocDetail({ doc, fields, flags }) {
  if (!doc) return <div style={{ padding: '2rem', color: '#888780', fontSize: 13, textAlign: 'center', marginTop: '3rem' }}>Select a document to view details</div>
  return (
    <div style={{ padding: '1.25rem', overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a18', marginBottom: 4 }}>{doc.filename}</div>
      <div style={{ fontSize: 12, color: '#888780', marginBottom: 16 }}>Status: {doc.status}</div>
      {doc.status === 'error' && (
        <div style={{ background: '#fcebeb', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#a32d2d' }}>
          Failed to process: {doc.error_message || 'Unknown error'}
        </div>
      )}
      {doc.status !== 'done' && doc.status !== 'error' && (
        <div style={{ background: '#faeeda', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#854f0b' }}>
          Processing document... this may take a minute.
        </div>
      )}
      {doc.ai_summary && (
        <>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#5f5e5a', marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Summary</div>
          <div style={{ fontSize: 13, color: '#3d3d3a', lineHeight: 1.6, background: '#f8f7f4', borderRadius: 8, padding: '10px 12px' }}>{doc.ai_summary}</div>
        </>
      )}
      {fields.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#5f5e5a', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Extracted Fields</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {fields.map(f => (
              <div key={f.id} style={{ background: '#f8f7f4', border: '0.5px solid #d3d1c7', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 11, color: '#888780', marginBottom: 2 }}>{f.field_name.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18' }}>{f.field_value}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || sending || !docReady) return
    const q = input.trim()
    setInput('')
    setSending(true)
    setMessages(m => [...m, { id: Date.now(), role: 'user', content: q }])
    try {
      const res = await sendChat(docId, q)
      setMessages(m => [...m, res.data])
    } catch {
      setMessages(m => [...m, { id: Date.now() + 1, role: 'assistant', content: 'Sorry, something went wrong.' }])
    }
    setSending(false)
  }

  if (!docId) return <div style={{ padding: '2rem', color: '#888780', fontSize: 13, textAlign: 'center', marginTop: '3rem' }}>Select a document to start chatting</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ color: '#888780', fontSize: 13, textAlign: 'center', marginTop: '2rem' }}>
            {docReady ? 'Ask anything about this document' : 'Document is still processing...'}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={m.id || i} style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, lineHeight: 1.5, maxWidth: '90%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? '#eeedfe' : '#f1efe8', color: '#1a1a18' }}>
            <div style={{ fontSize: 11, color: m.role === 'user' ? '#534ab7' : '#888780', marginBottom: 3, fontWeight: 500 }}>{m.role === 'user' ? 'You' : 'DocuAI'}</div>
            {m.content}
          </div>
        ))}
        {sending && <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, background: '#f1efe8', color: '#888780', alignSelf: 'flex-start' }}>Thinking...</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '10px', borderTop: '0.5px solid #d3d1c7', display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder={docReady ? 'Ask about this document...' : 'Processing...'} disabled={!docReady || sending} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '0.5px solid #d3d1c7', fontSize: 13, outline: 'none' }} />
        <button onClick={send} disabled={sending || !docReady} style={{ padding: '8px 14px', borderRadius: 8, background: '#534ab7', color: 'white', border: 'none', fontSize: 13, cursor: 'pointer', opacity: (!docReady || sending) ? 0.5 : 1 }}>Send</button>
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
    setFields([])
    setFlags([])
    if (doc.status === 'done') {
      loadDocDetails(doc.id)
    } else {
      pollRef.current = setInterval(async () => {
        try {
          const r = await getDocument(doc.id)
          setSelected(r.data)
          setDocs(d => d.map(x => x.id === doc.id ? r.data : x))
          if (r.data.status === 'done') {
            clearInterval(pollRef.current)
            loadDocDetails(doc.id)
          }
        } catch {}
      }, 3000)
    }
  }

  const loadDocDetails = async (id) => {
    try {
      const [f, fl] = await Promise.all([getFields(id), getFlags(id)])
      setFields(f.data)
      setFlags(fl.data)
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
    if (selected?.id === docId) {
      setSelected(null)
      setFields([])
      setFlags([])
    }
  } catch (err) {
    alert('Delete failed: ' + (err.response?.data?.detail || err.message))
  }
}

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', fontSize: 14, color: '#1a1a18', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: '#f1efe8', borderRight: '0.5px solid #d3d1c7', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '1rem 1rem 0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eeedfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📄</div>
          <span style={{ fontSize: 15, fontWeight: 500 }}>DocuAI</span>
        </div>
        <div style={{ padding: '0 8px 8px' }}>
          <label style={{ display: 'block', padding: '8px 12px', background: '#534ab7', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: uploading ? 'not-allowed' : 'pointer', textAlign: 'center', opacity: uploading ? 0.7 : 1 }}>
            {uploading ? 'Uploading...' : '+ Upload document'}
            <input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
          </label>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ padding: '12px 1rem', borderTop: '0.5px solid #d3d1c7' }}>
          <div style={{ fontSize: 12, color: '#888780', marginBottom: 6 }}>{user?.email}</div>
          <button onClick={() => { logout(); navigate('/') }} style={{ background: 'none', border: 'none', color: '#888780', fontSize: 13, cursor: 'pointer', padding: 0 }}>Sign out</button>
        </div>
      </div>

      {/* Document list */}
      <div style={{ width: 260, borderRight: '0.5px solid #d3d1c7', display: 'flex', flexDirection: 'column', background: 'white', flexShrink: 0 }}>
        <div style={{ padding: '12px 1rem', borderBottom: '0.5px solid #e5e4de', fontSize: 11, fontWeight: 500, color: '#5f5e5a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {docs.length} Document{docs.length !== 1 ? 's' : ''}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <DocList docs={docs} selected={selected} onSelect={selectDoc} onDelete={handleDelete} />
        </div>
      </div>

      {/* Document detail */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '0.5px solid #d3d1c7', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ padding: '12px 1rem', borderBottom: '0.5px solid #e5e4de', fontSize: 13, fontWeight: 500, color: '#1a1a18', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selected ? selected.filename : 'No document selected'}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <DocDetail doc={selected} fields={fields} flags={flags} />
        </div>
      </div>

      {/* Chat + flags panel */}
      <div style={{ width: 340, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '0.5px solid #d3d1c7', flexShrink: 0 }}>
          {['chat', 'flags'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid #534ab7' : '2px solid transparent', color: tab === t ? '#534ab7' : '#888780', fontSize: 13, fontWeight: tab === t ? 500 : 400, cursor: 'pointer', textTransform: 'capitalize' }}>
              {t === 'flags' ? `Risk flags${flags.length > 0 ? ` (${flags.length})` : ''}` : 'Chat'}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {tab === 'chat'
            ? <Chat docId={selected?.id} docReady={selected?.status === 'done'} />
            : (
              <div style={{ padding: '1rem', overflowY: 'auto', height: '100%' }}>
                {flags.length === 0
                  ? <div style={{ color: '#888780', fontSize: 13, textAlign: 'center', marginTop: '3rem' }}>{selected ? (selected.status === 'done' ? 'No risk flags detected' : 'Processing...') : 'Select a document'}</div>
                  : flags.map(f => (
                    <div key={f.id} style={{ background: SEV_BG[f.severity] || '#f8f7f4', borderRadius: 8, padding: '10px 12px', marginBottom: 8, borderLeft: `3px solid ${SEV_COLOR[f.severity] || '#888'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: SEV_COLOR[f.severity] }}>{f.flag_type.replace(/_/g, ' ')}</span>
                        <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 8, background: 'white', color: SEV_COLOR[f.severity] }}>{f.severity}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#3d3d3a', lineHeight: 1.5 }}>{f.description}</div>
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
