import { useAuth } from '@/store/useAuth'
import { useWorkspace } from '@/store/useWorkspace'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, MessageSquare, Database, Upload, Clock, Plus, CheckCircle2, Trash2 } from 'lucide-react'
import api from '@/lib/api'

export default function Dashboard() {
  const { user } = useAuth()
  const { workspaces, selectedWorkspaceId, loading, fetchWorkspaces, createWorkspace, deleteWorkspace, setSelectedWorkspaceId } = useWorkspace()
  const navigate = useNavigate()
  const [docs, setDocs] = useState<any[]>([])
  const [chats, setChats] = useState<any[]>([])
  const [newWsName, setNewWsName] = useState('')
  const [isCreatingWs, setIsCreatingWs] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [d, c] = await Promise.all([api.get('/documents'), api.get('/chat/history')])
        setDocs(d.data.slice(0, 5))
        setChats(c.data.slice(0, 5))
      } catch {}
    }
    load()
    fetchWorkspaces()
  }, [])

  const stats = [
    { label: 'Documents', value: docs.length, icon: FileText, color: 'text-violet-500', bg: 'bg-violet-50', ring: 'ring-violet-100' },
    { label: 'Conversations', value: chats.length, icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
    { label: 'Workspaces', value: workspaces.length, icon: Database, color: 'text-indigo-500', bg: 'bg-indigo-50', ring: 'ring-indigo-100' },
  ]

  const handleCreate = async () => {
    if (!newWsName.trim() || loading) return
    await createWorkspace(newWsName)
    setNewWsName('')
    setIsCreatingWs(false)
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-10">

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            Welcome back, <span className="text-violet-600">{user?.name}</span> 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">Your document intelligence hub — everything at a glance.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(s => (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-500">{s.label}</span>
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center ring-1 ${s.ring}`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <p className="text-4xl font-bold text-slate-800">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Upload Documents', sub: 'Add PDFs, Docs, or Slides', icon: Upload, accent: 'violet', path: '/upload' },
              { label: 'Chat with AI', sub: 'Ask questions about your data', icon: MessageSquare, accent: 'emerald', path: '/chat' },
            ].map(a => (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 text-left hover:shadow-md hover:border-violet-200 hover:scale-[1.01] transition-all shadow-sm group"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform ${
                  a.accent === 'violet' ? 'bg-violet-50' : 'bg-emerald-50'
                }`}>
                  <a.icon className={`w-5 h-5 ${a.accent === 'violet' ? 'text-violet-600' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{a.label}</p>
                  <p className="text-sm text-slate-400 mt-0.5">{a.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Workspaces */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-indigo-400" /> Workspaces
            </h2>
            <button
              onClick={() => setIsCreatingWs(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-violet-600 border border-violet-200 bg-violet-50 hover:bg-violet-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>

          {isCreatingWs && (
            <div className="flex gap-2 mb-4 animate-in slide-in-from-top-2 duration-200">
              <input
                autoFocus
                value={newWsName}
                onChange={e => setNewWsName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="e.g. Q3 Finance Report"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 shadow-sm transition-all"
              />
              <button
                disabled={loading || !newWsName.trim()}
                onClick={handleCreate}
                className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 transition-colors shadow-sm"
              >
                Create
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {workspaces.length === 0 && (
              <p className="text-sm text-slate-400 col-span-full">No workspaces yet.</p>
            )}
            {workspaces.map(ws => {
              const isActive = selectedWorkspaceId === ws._id
              return (
                <div
                  key={ws._id}
                  onClick={() => setSelectedWorkspaceId(ws._id)}
                  className={`bg-white rounded-2xl border overflow-hidden cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md shadow-sm ${
                    isActive ? 'border-violet-300 ring-2 ring-violet-100' : 'border-slate-100'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-700 truncate">{ws.name}</p>
                      {isActive && <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0 ml-2" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">{new Date(ws.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex border-t border-slate-100">
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 hover:bg-violet-50 transition-colors"
                      onClick={e => { e.stopPropagation(); setSelectedWorkspaceId(ws._id); navigate('/chat') }}
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Open Chat
                    </button>
                    <button
                      className="px-3 py-2 text-xs text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors border-l border-slate-100"
                      onClick={e => { e.stopPropagation(); deleteWorkspace(ws._id) }}
                      disabled={loading}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-violet-400" /> Recent Documents
            </h2>
            <div className="flex flex-col gap-2">
              {docs.length === 0
                ? <p className="text-sm text-slate-400">No documents uploaded yet.</p>
                : docs.map((doc, i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-100 flex items-center gap-3 px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{doc.filename}</p>
                      <p className="text-xs text-slate-400">{new Date(doc.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                      doc.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : doc.status === 'Failed' ? 'bg-red-50 text-red-500 border-red-200'
                      : 'bg-blue-50 text-blue-600 border-blue-200'
                    }`}>{doc.status}</span>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Recent Conversations
            </h2>
            <div className="flex flex-col gap-2">
              {chats.length === 0
                ? <p className="text-sm text-slate-400">No chat sessions yet.</p>
                : chats.map((chat, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-slate-100 flex items-center gap-3 px-4 py-3 shadow-sm hover:shadow-md hover:border-violet-200 transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedWorkspaceId(chat.workspaceId)
                      navigate(`/chat?workspaceId=${chat.workspaceId}&chatId=${chat._id}`)
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{chat.title || 'Untitled session'}</p>
                      <p className="text-xs text-slate-400">{new Date(chat.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
