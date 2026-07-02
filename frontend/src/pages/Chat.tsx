import { useState, useRef, useEffect, type RefObject } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Send, Paperclip, Loader2, CheckCircle2, AlertCircle, FileText, Sparkles, Share2 } from 'lucide-react'
import { useWorkspace } from '@/store/useWorkspace'
import api from '@/lib/api'

interface Citation { text?: string; filename?: string }
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

const SUGGESTIONS = [
  { icon: '📄', label: 'Summarize key points', prompt: 'Summarize the key points of the uploaded documents' },
  { icon: '🔍', label: 'Find main conclusions', prompt: 'What are the main conclusions from these documents?' },
  { icon: '✅', label: 'List action items', prompt: 'List all action items or tasks mentioned in the documents' },
  { icon: '💡', label: 'Explain technical terms', prompt: 'Explain the technical terms used in these documents' },
]

export default function Chat() {
  const { workspaces, selectedWorkspaceId, setSelectedWorkspaceId } = useWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlWorkspaceId = searchParams.get('workspaceId')
  const urlChatId = searchParams.get('chatId')

  const [chatId, setChatId] = useState<string | null>(urlChatId)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ name: string; status: string } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [showShareToast, setShowShareToast] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const activeWorkspace = workspaces.find(w => w._id === selectedWorkspaceId)

  const handleShare = () => {
    if (!chatId) return
    const shareUrl = `${window.location.origin}/share/${chatId}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShowShareToast(true)
      setTimeout(() => setShowShareToast(false), 2000)
    }).catch(err => {
      console.error('Could not copy shared URL: ', err)
    })
  }

  // 1. Sync workspaceId URL search parameter with Zustand store
  useEffect(() => {
    if (urlWorkspaceId && urlWorkspaceId !== selectedWorkspaceId) {
      setSelectedWorkspaceId(urlWorkspaceId)
    } else if (!urlWorkspaceId && selectedWorkspaceId) {
      setSearchParams({ workspaceId: selectedWorkspaceId ?? undefined }, { replace: true })
    }
  }, [urlWorkspaceId, selectedWorkspaceId, setSearchParams, setSelectedWorkspaceId])

  // 2. Fetch Chat History when URL chatId changes
  useEffect(() => {
    const fetchHistory = async () => {
      if (!urlChatId) {
        setMessages([])
        setChatId(null)
        return
      }
      setLoading(true)
      try {
        const { data } = await api.get(`/chat/${urlChatId}`)
        setChatId(urlChatId)

        const formatted = data.messages.map((m: any) => ({
          id: m._id || m.id || Math.random().toString(),
          role: m.role,
          content: m.content,
          citations: m.citations?.map((c: any) => ({
            filename: typeof c.documentId === 'object' && c.documentId ? c.documentId.filename : 'Document',
            text: c.paragraphText
          }))
        }))
        setMessages(formatted)
      } catch (err) {
        console.error("Failed to load chat history", err)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [urlChatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 180) + 'px'
  }, [input])

  const sendMessage = async (text?: string) => {
    const question = (text ?? input).trim()
    if (!question || loading) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: question }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      if (!selectedWorkspaceId) throw new Error('No workspace selected')
      const { data } = await api.post('/chat/message', { workspaceId: selectedWorkspaceId, question, chatId })
      
      if (data.chatId && data.chatId !== chatId) {
        setChatId(data.chatId)
        setSearchParams({ workspaceId: selectedWorkspaceId, chatId: data.chatId }, { replace: true })
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer || 'No answer returned.',
        citations: data.citations?.map((c: any) => ({
          filename: c.filename || 'Document',
          text: c.text
        })) || [],
      }])
    } catch (error: any) {
      const backendMessage = error?.response?.data?.error || error?.message || ''
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: backendMessage
          ? `⚠️ ${backendMessage}`
          : '⚠️ Could not connect to the AI service. Make sure Ollama is running locally.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file || !selectedWorkspaceId) return
    setUploading(true)
    setUploadStatus({ name: file.name, status: 'Uploading...' })
    const formData = new FormData()
    formData.append('file', file)
    formData.append('workspaceId', selectedWorkspaceId)
    try {
      const { data } = await api.post('/documents/upload', formData)
      const docId = data.document.id
      setUploading(false)
      const interval = setInterval(async () => {
        try {
          const res = await api.get(`/documents/${docId}/status`)
          setUploadStatus({ name: file.name, status: res.data.status })
          if (['Completed', 'Failed'].includes(res.data.status)) {
            clearInterval(interval)
            setUploading(false)
            if (res.data.status === 'Completed') {
              setMessages(prev => [...prev, {
                id: Date.now().toString(), role: 'assistant',
                content: `✅ **${file.name}** has been analyzed successfully. You can now ask questions about it!`,
              }])
            }
          }
        } catch { clearInterval(interval); setUploading(false) }
      }, 2000)
    } catch {
      setUploadStatus({ name: file.name, status: 'Failed' })
      setUploading(false)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="font-semibold text-slate-700 text-sm">
            {activeWorkspace ? activeWorkspace.name : 'DocuMind AI'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {chatId && (
            <div className="relative">
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-650 hover:bg-slate-50 transition-all select-none hover:border-slate-350 cursor-pointer active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                Share
              </button>
              {showShareToast && (
                <div className="absolute right-0 top-full mt-2 bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-md shadow-md whitespace-nowrap z-20">
                  Link copied to clipboard!
                </div>
              )}
            </div>
          )}
          {chatId && (
            <button
              onClick={async () => {
                try {
                  await api.delete(`/chat/${chatId}`);
                  setMessages([]);
                  setChatId(null);
                  setSearchParams({ workspaceId: selectedWorkspaceId ?? undefined }, { replace: true });
                } catch (err) {
                  console.error('Failed to clear chat history', err);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition-all select-none hover:border-red-300 cursor-pointer active:scale-95"
            >
              Clear History
            </button>
          )}
          {workspaces.length > 0 && (
            <select
              value={selectedWorkspaceId || ''}
              onChange={e => {
                setSelectedWorkspaceId(e.target.value)
                setSearchParams({ workspaceId: e.target.value }, { replace: true })
              }}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-200 bg-white"
            >
              {workspaces.map(ws => <option key={ws._id} value={ws._id}>{ws.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          /* Landing */
          <div className="flex flex-col items-center justify-center min-h-full px-6 py-16 max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-200">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 text-center mb-2">
              {activeWorkspace ? `Chat with ${activeWorkspace.name}` : 'How can I help you?'}
            </h1>
            <p className="text-slate-500 text-center mb-10 text-sm leading-relaxed">
              {selectedWorkspaceId
                ? 'Upload documents or ask questions about your knowledge base.'
                : 'Select a workspace from the sidebar, or create a new one to get started.'}
            </p>

            {/* Input centered */}
            <div className="w-full mb-8">
              <ChatInput
                textareaRef={textareaRef}
                input={input}
                setInput={setInput}
                onSend={() => sendMessage()}
                        onFileUpload={handleFileUpload}
                uploading={uploading}
                loading={loading}
                disabled={!selectedWorkspaceId}
                placeholder={selectedWorkspaceId ? 'Ask anything about your documents...' : 'Select a workspace first...'}
              />
            </div>

            {uploadStatus && <UploadStatus status={uploadStatus} />}

            {/* Suggestion chips */}
            {selectedWorkspaceId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s.prompt)}
                    disabled={loading || uploading}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white text-left text-sm text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40 transition-all shadow-sm hover:shadow-md"
                  >
                    <span className="text-lg">{s.icon}</span>
                    <span className="font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Thread */
          <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white'
                    : 'bg-white border border-slate-200 text-violet-600'
                }`}>
                  {msg.role === 'user' ? 'U' : <Sparkles className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div className={`group max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-sm'
                      : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 space-y-1.5 w-full max-w-full">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Sources</p>
                      {msg.citations.map((c, j) => (
                        <div key={j} className="flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                          <FileText className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-violet-600">{c.filename}</p>
                            {c.text && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 italic">"{c.text}"</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {(loading || uploading) && (
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                  {uploading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                      <span className="text-sm text-slate-500">Processing {uploadStatus?.name}...</span>
                    </div>
                  ) : (
                    <span className="flex gap-1">
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></span>
                    </span>
                  )}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Sticky input (when thread exists) */}
      {!isEmpty && (
        <div className="border-t border-slate-100 bg-white/90 backdrop-blur-sm px-4 py-4">
          {uploadStatus && <div className="max-w-3xl mx-auto mb-2"><UploadStatus status={uploadStatus} /></div>}
          <div className="max-w-3xl mx-auto">
            <ChatInput
              textareaRef={textareaRef}
              input={input}
              setInput={setInput}
              onSend={() => sendMessage()}
              onFileUpload={handleFileUpload}
              uploading={uploading}
              loading={loading}
              disabled={!selectedWorkspaceId}
              placeholder="Ask anything..."
            />
          </div>
          <p className="text-center text-xs text-slate-400 mt-2">DocuMind AI · Answers grounded in your uploaded documents</p>
        </div>
      )}
    </div>
  )
}

/* Subcomponents */
function UploadStatus({ status }: { status: { name: string; status: string } }) {
  const done = status.status === 'Completed'
  const failed = status.status === 'Failed'
  return (
    <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full w-max mx-auto border ${
      done ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : failed ? 'bg-red-50 border-red-200 text-red-600'
      : 'bg-violet-50 border-violet-200 text-violet-600'
    }`}>
      {done ? <CheckCircle2 className="w-3.5 h-3.5" />
        : failed ? <AlertCircle className="w-3.5 h-3.5" />
        : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {status.name} · {status.status}
    </div>
  )
}

interface ChatInputProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  input: string
  setInput: (v: string) => void
  onSend: () => void
  onFileUpload: (f: File) => void
  uploading: boolean
  loading: boolean
  disabled: boolean
  placeholder: string
}

function ChatInput({ textareaRef, input, setInput, onSend, onFileUpload, uploading, loading, disabled, placeholder }: ChatInputProps) {
  const canSend = input.trim() && !loading && !disabled
  return (
    <div className={`flex items-end gap-2 rounded-2xl border bg-white px-3 py-2 shadow-sm transition-all ${
      disabled ? 'opacity-60 border-slate-200' : 'border-slate-200 hover:border-violet-300 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100'
    }`}>
      <input type="file" id="chat-file-upload" className="hidden" accept=".pdf,.docx,.txt,.md,.csv"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFileUpload(f) }} />
      <button
        type="button"
        disabled={uploading || loading || disabled}
        onClick={() => document.getElementById('chat-file-upload')?.click()}
        className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 transition-colors text-slate-400 hover:text-violet-600 flex-shrink-0 self-end"
        title="Upload document"
      >
        {uploading ? <Loader2 className="w-5 h-5 animate-spin text-violet-500" /> : <Paperclip className="w-5 h-5" />}
      </button>

      <textarea
        ref={textareaRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
        placeholder={placeholder}
        disabled={loading || disabled}
        rows={1}
        className="flex-1 bg-transparent resize-none outline-none text-sm leading-6 text-slate-700 placeholder-slate-400 disabled:opacity-50 max-h-[180px] py-1.5"
      />

      <button
        type="button"
        onClick={onSend}
        disabled={!canSend}
        className={`p-2 rounded-xl flex-shrink-0 self-end transition-all ${
          canSend
            ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200 hover:scale-105'
            : 'bg-slate-100 text-slate-400'
        }`}
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  )
}
