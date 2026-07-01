import { create } from 'zustand';
import api from '@/lib/api';

export interface Workspace {
  _id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

interface WorkspaceState {
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  loading: boolean;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  setSelectedWorkspaceId: (id: string) => void;
}

export const useWorkspace = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  selectedWorkspaceId: null,
  loading: false,

  fetchWorkspaces: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/workspaces');
      set({ workspaces: data, loading: false });
      
      // Auto-select first workspace if none is selected
      if (!get().selectedWorkspaceId && data.length > 0) {
        set({ selectedWorkspaceId: data[0]._id });
      }
    } catch (error) {
      console.error('Failed to fetch workspaces', error);
      set({ loading: false });
    }
  },

  createWorkspace: async (name: string) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/workspaces', { name });
      set((state) => ({
        workspaces: [data, ...state.workspaces],
        selectedWorkspaceId: data._id, 
        loading: false
      }));
    } catch (error) {
      console.error('Failed to create workspace', error);
      set({ loading: false });
    }
  },

  deleteWorkspace: async (id: string) => {
    set({ loading: true });
    try {
      await api.delete(`/workspaces/${id}`);
      set((state) => {
        const newWorkspaces = state.workspaces.filter(ws => ws._id !== id);
        return {
          workspaces: newWorkspaces,
          selectedWorkspaceId: state.selectedWorkspaceId === id 
            ? (newWorkspaces.length > 0 ? newWorkspaces[0]._id : null) 
            : state.selectedWorkspaceId,
          loading: false
        };
      });
    } catch (error) {
      console.error('Failed to delete workspace', error);
      set({ loading: false });
    }
  },

  setSelectedWorkspaceId: (id: string) => set({ selectedWorkspaceId: id })
}));
