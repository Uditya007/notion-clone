import { create } from 'zustand';

export type Page = {
  id: string;
  title: string;
  content: string;
  icon: string;
  coverImage: string | null;
  parentId: string | null;
  children: string[];
  type: 'editor' | 'board' | 'calendar' | 'inbox' | 'tasks' | 'automations' | 'templates' | 'trash';
  isFavorite?: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
};

export type ColumnType = 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'checkbox' | 'url';

export type Column = {
  id: string;
  name: string;
  type: ColumnType;
  options?: string[];
  position?: number;
};

export type Row = {
  id: string;
  cells: Record<string, any>;
  pageContent: string;
  position?: number;
};

export type Database = {
  id: string;
  page_id?: string;
  user_id?: string;
  name: string;
  columns: Column[];
  rows: Row[];
  view: 'table' | 'board' | 'gallery';
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
};

export type Task = {
  id: string;
  title: string;
  dueDate?: string | null;
  due?: string | null; // keep for backward compatibility
  completed: boolean;
};

export type Conversation = {
  id: string;
  title: string;
  messages?: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

type AppState = {
  activePageId: string | null;
  activeConversationId: string | null;
  
  // UI States
  isSearchOpen: boolean;
  isSettingsOpen: boolean;
  isAIPanelOpen: boolean;
  sidebarCollapsed: boolean;
  
  // Toasts
  toasts: Toast[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  
  // AI Model state
  aiModel: string;
  setAIModel: (model: string) => void;
  
  // Actions
  setActivePage: (id: string | null) => void;
  setSearchOpen: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  setAIPanelOpen: (isOpen: boolean) => void;
  setSidebarCollapsed: (isCollapsed: boolean) => void;
  setActiveConversation: (id: string | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  activePageId: null,
  activeConversationId: null,
  isSearchOpen: false,
  isSettingsOpen: false,
  isAIPanelOpen: false,
  sidebarCollapsed: false,
  toasts: [],
  aiModel: typeof window !== 'undefined' ? (localStorage.getItem('clearspace-ai-model') || 'gemini-2.5-flash') : 'gemini-2.5-flash',
  
  addToast: (message, type, duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, message, type, duration }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, duration);
  },
  
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),
  setAIModel: (model) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('clearspace-ai-model', model);
    }
    set({ aiModel: model });
  },
  
  setActivePage: (id) => set({ activePageId: id, activeConversationId: null, isSearchOpen: false }),
  setSearchOpen: (isOpen) => set({ isSearchOpen: isOpen }),
  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
  setAIPanelOpen: (isOpen) => set({ isAIPanelOpen: isOpen }),
  setSidebarCollapsed: (isCollapsed) => set({ sidebarCollapsed: isCollapsed }),
  setActiveConversation: (id): void => set((state) => ({ 
    activeConversationId: id, 
    activePageId: id ? null : state.activePageId 
  })),
}));
