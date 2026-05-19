import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

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
};

export type ColumnType = 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'checkbox' | 'url';

export type Column = {
  id: string;
  name: string;
  type: ColumnType;
  options?: string[];
};

export type Row = {
  id: string;
  cells: Record<string, any>;
  pageContent: string;
};

export type Database = {
  id: string;
  name: string;
  columns: Column[];
  rows: Row[];
  view: 'table' | 'board' | 'gallery';
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

type AppState = {
  pages: Record<string, Page>;
  activePageId: string | null;
  rootPageIds: string[];
  deletedPages: Record<string, Page & { deletedAt: string }>;
  workspaceName: string;
  databases: Record<string, Database>;
  conversations: Record<string, Conversation>;
  activeConversationId: string | null;
  
  // UI States
  isSearchOpen: boolean;
  isSettingsOpen: boolean;
  isAIPanelOpen: boolean;
  
  // Actions
  setActivePage: (id: string) => void;
  setSearchOpen: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  setAIPanelOpen: (isOpen: boolean) => void;
  updateWorkspaceName: (name: string) => void;
  addPage: (parentId: string | null) => string;
  updatePageTitle: (id: string, title: string) => void;
  updatePageContent: (id: string, content: string) => void;
  updatePageIcon: (id: string, icon: string) => void;
  updatePageCoverImage: (id: string, coverImage: string | null) => void;
  updatePageType: (id: string, type: 'editor' | 'board' | 'calendar' | 'inbox' | 'tasks' | 'automations' | 'templates' | 'trash') => void;
  toggleFavorite: (id: string) => void;
  deletePage: (id: string) => void;
  restorePage: (id: string) => void;
  permanentlyDeletePage: (id: string) => void;
  applyTemplate: (title: string, icon: string, content: string, type: 'editor' | 'board') => void;
  
  // Database Actions
  createDatabase: (pageId: string) => void;
  addColumn: (dbId: string, column: Column) => void;
  updateColumn: (dbId: string, columnId: string, changes: Partial<Column>) => void;
  deleteColumn: (dbId: string, columnId: string) => void;
  addRow: (dbId: string) => void;
  updateCell: (dbId: string, rowId: string, columnId: string, value: any) => void;
  updateRowContent: (dbId: string, rowId: string, content: string) => void;
  deleteRow: (dbId: string, rowId: string) => void;
  setDatabaseView: (dbId: string, view: 'table' | 'board' | 'gallery') => void;

  // AI Chat Actions
  createConversation: () => string;
  addMessage: (convId: string, message: ChatMessage) => void;
  deleteConversation: (convId: string) => void;
  setActiveConversation: (id: string | null) => void;
};

const initialPageId = uuidv4();

const initialState = {
  pages: {
    [initialPageId]: {
      id: initialPageId,
      title: "Getting Started",
      content: "<h1>Welcome to your new workspace</h1><p>Start typing to see the magic happen...</p>",
      icon: "🚀",
      coverImage: "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?q=80&w=2275&auto=format&fit=crop",
      parentId: null,
      children: [],
      type: 'editor',
      isFavorite: false,
    },
    'inbox': {
      id: 'inbox',
      title: "Inbox",
      content: "",
      icon: "📥",
      coverImage: null,
      parentId: null,
      children: [],
      type: 'inbox',
      isFavorite: false,
    },
    'calendar': {
      id: 'calendar',
      title: "Google Calendar",
      content: "",
      icon: "📅",
      coverImage: null,
      parentId: null,
      children: [],
      type: 'calendar',
      isFavorite: false,
    },
    'tasks': {
      id: 'tasks',
      title: "My Tasks",
      content: "",
      icon: "☑️",
      coverImage: null,
      parentId: null,
      children: [],
      type: 'tasks',
      isFavorite: false,
    },
    'automations': {
      id: 'automations',
      title: "Automations",
      content: "",
      icon: "⚡",
      coverImage: null,
      parentId: null,
      children: [],
      type: 'automations',
      isFavorite: false,
    },
    'templates': {
      id: 'templates',
      title: "Templates",
      content: "",
      icon: "✨",
      coverImage: null,
      parentId: null,
      children: [],
      type: 'templates',
      isFavorite: false,
    },
    'trash': {
      id: 'trash',
      title: "Trash",
      content: "",
      icon: "🗑",
      coverImage: null,
      parentId: null,
      children: [],
      type: 'trash',
      isFavorite: false,
    }
  },
  activePageId: initialPageId,
  rootPageIds: [initialPageId, 'inbox', 'calendar', 'tasks', 'automations', 'templates'],
  deletedPages: {},
  workspaceName: "My Workspace",
  databases: {},
  conversations: {},
  activeConversationId: null,
  isSearchOpen: false,
  isSettingsOpen: false,
  isAIPanelOpen: false,
} as Pick<AppState, 'pages' | 'activePageId' | 'rootPageIds' | 'deletedPages' | 'workspaceName' | 'databases' | 'conversations' | 'activeConversationId' | 'isSearchOpen' | 'isSettingsOpen' | 'isAIPanelOpen'>;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
  
  setActivePage: (id) => set({ activePageId: id, activeConversationId: null, isSearchOpen: false }),
  setSearchOpen: (isOpen) => set({ isSearchOpen: isOpen }),
  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
  setAIPanelOpen: (isOpen) => set({ isAIPanelOpen: isOpen }),
  updateWorkspaceName: (name) => set({ workspaceName: name }),
  
  addPage: (parentId) => {
    const newId = uuidv4();
    const newPage: Page = {
      id: newId,
      title: "Untitled",
      content: "",
      icon: "📄",
      coverImage: null,
      parentId,
      children: [],
      type: 'editor',
      isFavorite: false,
    };

    set((state) => {
      const newPages = { ...state.pages, [newId]: newPage };
      const newRootIds = [...state.rootPageIds];
      
      if (parentId && newPages[parentId]) {
        newPages[parentId] = {
          ...newPages[parentId],
          children: [...newPages[parentId].children, newId],
        };
      } else {
        newRootIds.push(newId);
      }
      
      return {
        pages: newPages,
        rootPageIds: newRootIds,
        activePageId: newId, // auto-navigate to new page
      };
    });
    
    return newId;
  },

  updatePageTitle: (id, title) => set((state) => ({
    pages: {
      ...state.pages,
      [id]: { ...state.pages[id], title }
    }
  })),

  updatePageContent: (id, content) => set((state) => ({
    pages: {
      ...state.pages,
      [id]: { ...state.pages[id], content }
    }
  })),

  updatePageIcon: (id, icon) => set((state) => ({
    pages: {
      ...state.pages,
      [id]: { ...state.pages[id], icon }
    }
  })),

  updatePageCoverImage: (id, coverImage) => set((state) => ({
    pages: {
      ...state.pages,
      [id]: { ...state.pages[id], coverImage }
    }
  })),

  updatePageType: (id, type) => set((state) => ({
    pages: {
      ...state.pages,
      [id]: { ...state.pages[id], type }
    }
  })),

  toggleFavorite: (id) => set((state) => ({
    pages: {
      ...state.pages,
      [id]: { ...state.pages[id], isFavorite: !state.pages[id].isFavorite }
    }
  })),

  deletePage: (id) => set((state) => {
    const newPages = { ...state.pages };
    const pageToDelete = newPages[id];
    if (!pageToDelete) return state;

    let newRootIds = state.rootPageIds;
    
    if (pageToDelete.parentId && newPages[pageToDelete.parentId]) {
      newPages[pageToDelete.parentId] = {
        ...newPages[pageToDelete.parentId],
        children: newPages[pageToDelete.parentId].children.filter(childId => childId !== id),
      };
    } else {
      newRootIds = newRootIds.filter(rootId => rootId !== id);
    }
    
    delete newPages[id];
    
    const newDeletedPages = { 
      ...state.deletedPages, 
      [id]: { ...pageToDelete, deletedAt: new Date().toISOString() } 
    };
    
    let newActiveId = state.activePageId;
    if (newActiveId === id) {
      newActiveId = newRootIds.length > 0 ? newRootIds[0] : null;
    }
    
    return {
      pages: newPages,
      rootPageIds: newRootIds,
      deletedPages: newDeletedPages,
      activePageId: newActiveId,
    };
  }),

  restorePage: (id) => set((state) => {
    const pageToRestore = state.deletedPages[id];
    if (!pageToRestore) return state;

    const newDeletedPages = { ...state.deletedPages };
    delete newDeletedPages[id];

    // Remove deletedAt property
    const { deletedAt, ...restPage } = pageToRestore;

    return {
      deletedPages: newDeletedPages,
      pages: { ...state.pages, [id]: restPage },
      rootPageIds: [...state.rootPageIds, id],
    };
  }),

  permanentlyDeletePage: (id) => set((state) => {
    const newDeletedPages = { ...state.deletedPages };
    delete newDeletedPages[id];
    return { deletedPages: newDeletedPages };
  }),

  applyTemplate: (title, icon, content, type) => {
    set((state) => {
      const newId = uuidv4();
      const newPage: Page = {
        id: newId,
        title,
        content,
        icon,
        coverImage: null,
        parentId: null,
        children: [],
        type,
        isFavorite: false,
      };
      
      return {
        pages: { ...state.pages, [newId]: newPage },
        rootPageIds: [...state.rootPageIds, newId],
        activePageId: newId,
      };
    });
  },

  createDatabase: (pageId) => set((state) => {
    if (state.databases[pageId]) return state; // Already exists
    
    const newDb: Database = {
      id: pageId,
      name: 'Untitled Database',
      columns: [
        { id: 'col-title', name: 'Name', type: 'text' },
        { id: 'col-tags', name: 'Tags', type: 'multiselect', options: ['Important', 'Review'] }
      ],
      rows: [
        { id: uuidv4(), cells: { 'col-title': 'First Item', 'col-tags': ['Important'] }, pageContent: '' },
        { id: uuidv4(), cells: { 'col-title': 'Second Item', 'col-tags': [] }, pageContent: '' },
        { id: uuidv4(), cells: { 'col-title': 'Third Item', 'col-tags': ['Review'] }, pageContent: '' }
      ],
      view: 'table'
    };
    
    return {
      databases: { ...state.databases, [pageId]: newDb }
    };
  }),

  addColumn: (dbId, column) => set((state) => {
    const db = state.databases[dbId];
    if (!db) return state;
    
    return {
      databases: {
        ...state.databases,
        [dbId]: {
          ...db,
          columns: [...db.columns, column]
        }
      }
    };
  }),

  updateColumn: (dbId, columnId, changes) => set((state) => {
    const db = state.databases[dbId];
    if (!db) return state;
    
    return {
      databases: {
        ...state.databases,
        [dbId]: {
          ...db,
          columns: db.columns.map(col => col.id === columnId ? { ...col, ...changes } : col)
        }
      }
    };
  }),

  deleteColumn: (dbId, columnId) => set((state) => {
    const db = state.databases[dbId];
    if (!db) return state;
    
    return {
      databases: {
        ...state.databases,
        [dbId]: {
          ...db,
          columns: db.columns.filter(col => col.id !== columnId)
        }
      }
    };
  }),

  addRow: (dbId) => set((state) => {
    const db = state.databases[dbId];
    if (!db) return state;
    
    const newRow: Row = {
      id: uuidv4(),
      cells: {},
      pageContent: ''
    };
    
    return {
      databases: {
        ...state.databases,
        [dbId]: {
          ...db,
          rows: [...db.rows, newRow]
        }
      }
    };
  }),

  updateCell: (dbId, rowId, columnId, value) => set((state) => {
    const db = state.databases[dbId];
    if (!db) return state;
    
    return {
      databases: {
        ...state.databases,
        [dbId]: {
          ...db,
          rows: db.rows.map(row => {
            if (row.id === rowId) {
              return {
                ...row,
                cells: {
                  ...row.cells,
                  [columnId]: value
                }
              };
            }
            return row;
          })
        }
      }
    };
  }),

  updateRowContent: (dbId, rowId, content) => set((state) => {
    const db = state.databases[dbId];
    if (!db) return state;
    
    return {
      databases: {
        ...state.databases,
        [dbId]: {
          ...db,
          rows: db.rows.map(row => {
            if (row.id === rowId) {
              return { ...row, pageContent: content };
            }
            return row;
          })
        }
      }
    };
  }),

  deleteRow: (dbId, rowId) => set((state) => {
    const db = state.databases[dbId];
    if (!db) return state;
    
    return {
      databases: {
        ...state.databases,
        [dbId]: {
          ...db,
          rows: db.rows.filter(row => row.id !== rowId)
        }
      }
    };
  }),

  setDatabaseView: (dbId, view) => set((state) => {
    const db = state.databases[dbId];
    if (!db) return state;
    
    return {
      databases: {
        ...state.databases,
        [dbId]: {
          ...db,
          view
        }
      }
    };
  }),

  // AI Chat Implementations
  createConversation: () => {
    const newId = uuidv4();
    const newConv: Conversation = {
      id: newId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      conversations: { ...state.conversations, [newId]: newConv },
      activeConversationId: newId,
      activePageId: null // Clear active page when viewing a chat
    }));
    return newId;
  },

  addMessage: (convId, message) => set((state) => {
    const conv = state.conversations[convId];
    if (!conv) return state;
    
    const updatedMessages = [...conv.messages, message];
    // Auto-update title on first user message
    let newTitle = conv.title;
    if (updatedMessages.length === 1 && message.role === 'user') {
      newTitle = message.content.slice(0, 40) + (message.content.length > 40 ? '...' : '');
    }

    return {
      conversations: {
        ...state.conversations,
        [convId]: {
          ...conv,
          title: newTitle,
          messages: updatedMessages,
          updatedAt: new Date().toISOString(),
        }
      }
    };
  }),

  deleteConversation: (convId) => set((state) => {
    const newConvs = { ...state.conversations };
    delete newConvs[convId];
    
    let newActiveId = state.activeConversationId;
    if (newActiveId === convId) {
      newActiveId = null;
    }
    
    return {
      conversations: newConvs,
      activeConversationId: newActiveId,
    };
  }),

  setActiveConversation: (id) => set({ 
    activeConversationId: id, 
    activePageId: id ? null : useAppStore.getState().activePageId 
  }),
}), {
  name: 'notion-clone-storage',
}));
