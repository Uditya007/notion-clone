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

type AppState = {
  activePageId: string | null;
  activeConversationId: string | null;
  
  // UI States
  isSearchOpen: boolean;
  isSettingsOpen: boolean;
  isAIPanelOpen: boolean;
  sidebarCollapsed: boolean;
  
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
  
  setActivePage: (id) => set({ activePageId: id, activeConversationId: null, isSearchOpen: false }),
  setSearchOpen: (isOpen) => set({ isSearchOpen: isOpen }),
  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
  setAIPanelOpen: (isOpen) => set({ isAIPanelOpen: isOpen }),
  setSidebarCollapsed: (isCollapsed) => set({ sidebarCollapsed: isCollapsed }),
  setActiveConversation: (id) => set((state) => ({ 
    activeConversationId: id, 
    activePageId: id ? null : state.activePageId 
  })),
}));
