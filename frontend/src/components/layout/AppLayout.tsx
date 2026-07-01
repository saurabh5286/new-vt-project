import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '@/store/useAuth'
import { useWorkspace } from '@/store/useWorkspace'
import { FileText, MessageSquare, Settings, Plus, Trash2, LayoutDashboard, Menu, X } from 'lucide-react'

export const AppLayout = () => {
  const { user, logout } = useAuth()
  const { workspaces, selectedWorkspaceId, fetchWorkspaces, createWorkspace, deleteWorkspace, setSelectedWorkspaceId } = useWorkspace()
  const navigate = useNavigate()
  const location = useLocation()
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    if (user) fetchWorkspaces()
  }, [user])

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname, selectedWorkspaceId])

  const handleCreate = async () => {
    if (!newName.trim()) return
    await createWorkspace(newName.trim())
    setNewName('')
    setIsCreating(false)
    navigate('/chat')
  }

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans bg-slate-50">
      {/* Backdrop for mobile */}
      {user && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-30 md:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {user && (
        <aside className={`fixed md:static inset-y-0 left-0 z-40 w-[260px] flex flex-col flex-shrink-0 h-full bg-white border-r border-slate-100 shadow-sm transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
          {/* Brand */}
          <div className="flex items-center justify-between px-4 pt-5 pb-2">
            <Link to="/chat" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-800 tracking-tight text-sm">DocuMind AI</span>
            </Link>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setIsCreating(v => !v)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-violet-600 transition-colors"
                title="New Workspace"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors md:hidden"
                title="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Inline create */}
          {isCreating && (
            <div className="px-3 mb-2 flex gap-1.5 animate-in slide-in-from-top-2 duration-200">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Workspace name..."
                className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all bg-white"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
            </div>
          )}

          {/* Nav links */}
          <div className="px-3 mb-1">
            <Link to="/dashboard"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          </div>

          {/* Workspace label */}
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Workspaces</p>

          {/* Workspace list */}
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {workspaces.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-400">No workspaces yet.</p>
            )}
            {workspaces.map(ws => {
              const isActive = selectedWorkspaceId === ws._id
              return (
                <div
                  key={ws._id}
                  onClick={() => { setSelectedWorkspaceId(ws._id); navigate('/chat') }}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm ${
                    isActive
                      ? 'bg-violet-50 text-violet-700 font-medium shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-violet-500' : 'text-slate-400'}`} />
                  <span className="truncate flex-1">{ws.name}</span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteWorkspace(ws._id) }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Bottom */}
          <div className="p-3 border-t border-slate-100">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="truncate">Settings</span>
            </Link>
            <div
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer mt-0.5 transition-colors"
              onClick={() => { logout(); navigate('/login') }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-white text-xs font-bold">{user.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{user.name}</p>
                <p className="text-xs text-slate-400">Log out</p>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative">
        {/* Mobile Header */}
        {user && (
          <header className="flex md:hidden items-center justify-between px-4 py-3 bg-white border-b border-slate-100 shrink-0 select-none z-20">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all border border-transparent active:scale-95"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-slate-800 text-sm tracking-tight">DocuMind AI</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-violet-100">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </header>
        )}

        {!user && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-200/40 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-20 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl" />
          </div>
        )}
        <div className="flex-1 h-full overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
