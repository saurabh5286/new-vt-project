import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Sparkles, FileText, ArrowRight, Loader2 } from 'lucide-react'
import api from '@/lib/api'

interface Citation { text?: string; filename?: string }
interface Message {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

interface ChatData {
  title: string
  messages: {
    role: 'user' | 'assistant'
    content: string
    citations?: {
      documentId?: { filename: string } | string
      paragraphText?: string
    }[]
  }[]
}

export default function ShareView() {
  const { chatId } = useParams<{ chatId: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chat, setChat] = useState<ChatData | null>(null)

  useEffect(() => {
    const fetchShared = async () => {
      try {
        const { data } = await api.get(`/chat/share/${chatId}`)
        setChat(data)
      } catch (err) {
        setError('This shared conversation could not be loaded or no longer exists.')
      } finally {
        setLoading(false)
      }
    }
    fetchShared()
  }, [chatId])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <span className="text-sm text-slate-500 font-medium">Loading conversation...</span>
        </div>
      </div>
    )
  }

  if (error || !chat) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md w-full text-center bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Unavailable</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">{error || 'An error occurred.'}</p>
          <Link to="/login" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
            Go to DocuMind <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-full bg-white overflow-hidden">
      {/* Shared Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0 shadow-sm relative z-10">
        <Link to="/login" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-800 tracking-tight text-sm">DocuMind AI</span>
        </Link>
        <Link
          to="/register"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200"
        >
          Try DocuMind Free <ArrowRight className="w-4 h-4" />
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50">
        <div className="max-w-3xl mx-auto px-4 py-12">
          {/* Shared Banner */}
          <div className="mb-10 text-center border-b border-slate-100 pb-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 text-xs font-semibold uppercase tracking-wider mb-3">
              Shared Conversation
            </span>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-tight px-4">
              {chat.title}
            </h1>
            <p className="text-xs text-slate-400 mt-2">Shared via DocuMind Document Assistant</p>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-8">
            {chat.messages.map((msg, i) => (
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
                      {msg.citations.map((c, j) => {
                        const filename = typeof c.documentId === 'object' && c.documentId ? c.documentId.filename : 'Document'
                        return (
                          <div key={j} className="flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                            <FileText className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-violet-600">{filename}</p>
                              {c.paragraphText && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 italic">"{c.paragraphText}"</p>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* CTA Footer */}
          <div className="mt-16 text-center border-t border-slate-150 pt-10 flex flex-col items-center">
            <h3 className="font-bold text-slate-800 text-lg mb-2">Want to ask your own questions?</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">Upload your own PDFs, CSVs, or markdown files and chat with them instantly using RAG.</p>
            <Link to="/register" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-750 text-white text-sm font-semibold transition-all hover:scale-105 shadow-sm shadow-violet-200">
              Get Started with DocuMind <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
