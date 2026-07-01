import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useWorkspace } from '@/store/useWorkspace'
import api from '@/lib/api'

interface UploadedDoc {
  id: string
  filename: string
  status: string
}

export default function UploadPage() {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [docs, setDocs] = useState<UploadedDoc[]>([])
  const [error, setError] = useState('')
  const { workspaces, selectedWorkspaceId, setSelectedWorkspaceId } = useWorkspace()
  const navigate = useNavigate()

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError('')
    setUploading(true)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append('file', file)

      try {
        const { data } = await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        setDocs(prev => [...prev, {
          id: data.document.id,
          filename: data.document.filename,
          status: data.document.status
        }])

        // Poll for status updates
        pollStatus(data.document.id)
      } catch (err: any) {
        setError(err.response?.data?.error || `Failed to upload ${file.name}`)
      }
    }
    setUploading(false)
  }

  const pollStatus = async (docId: string) => {
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/documents/${docId}/status`)
        setDocs(prev => prev.map(d => d.id === docId ? { ...d, status: data.status } : d))
        if (['Completed', 'Failed'].includes(data.status)) {
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
      }
    }, 2000)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [])

  const statusIcon = (status: string) => {
    if (status === 'Completed') return <CheckCircle className="w-4 h-4 text-green-500" />
    if (status === 'Failed') return <AlertCircle className="w-4 h-4 text-red-500" />
    return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-3xl mx-auto w-full relative z-10 animate-in-fade">
      <div className="text-center mb-4">
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">Upload Documents</h1>
        <p className="text-muted-foreground mt-2 text-lg">Send PDFs, Word documents, or text files to your AI brain.</p>
      </div>
      
      {/* Workspace Selector */}
      {workspaces.length > 0 && (
        <div className="bg-white/40 glass p-4 rounded-xl border border-white/60 shadow-sm flex items-center justify-between">
          <span className="font-semibold text-slate-700">Target Workspace:</span>
          <select 
            value={selectedWorkspaceId || ''} 
            onChange={(e) => setSelectedWorkspaceId(e.target.value)}
            className="bg-white/70 border border-indigo-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
          >
            {workspaces.map(ws => (
              <option key={ws._id} value={ws._id}>{ws.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Dropzone */}
      <Card
        className={`border-2 border-dashed transition-all cursor-pointer glass shadow-xl ${dragging ? 'border-primary bg-primary/10 scale-105' : 'border-indigo-200 hover:border-indigo-400 hover:shadow-2xl'}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <CardContent className="flex flex-col items-center gap-4 py-16">
          <div className="p-5 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 shadow-inner">
            <UploadIcon className="w-10 h-10 text-indigo-600" />
          </div>
          <div className="text-center">
            <p className="font-bold text-xl text-slate-800">Drag & drop files here, or browse</p>
            <p className="text-sm text-slate-500 mt-2">Supports PDF, DOCX, TXT, MD, CSV (max 200MB)</p>
          </div>
          {uploading && <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mt-4" />}
        </CardContent>
      </Card>

      <input
        id="file-input"
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.docx,.txt,.md,.csv"
        onChange={e => handleFiles(e.target.files)}
      />

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded p-3">{error}</p>}

      {/* Uploaded files list */}
      {docs.length > 0 && (
        <div className="space-y-3 mt-6">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-slate-800 to-slate-600">Processing Queue</h2>
          {docs.map(doc => (
            <Card key={doc.id} className="glass border-white/60 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 py-4 px-5">
                <FileText className="w-6 h-6 text-indigo-400 shrink-0" />
                <span className="flex-1 text-sm font-semibold truncate text-slate-700">{doc.filename}</span>
                <span className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-white/50 px-3 py-1 rounded-full">
                  {statusIcon(doc.status)}
                  {doc.status}
                </span>
              </CardContent>
            </Card>
          ))}

          {docs.some(d => d.status === 'Completed') && (
            <div className="pt-6">
              <Button className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-indigo-500/25 transition-all" onClick={() => navigate('/chat')}>
                Chat with your documents →
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
