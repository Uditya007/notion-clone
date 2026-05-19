import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type Page = {
  id: string;
  title: string;
  content: string;
  icon: string;
  coverImage: string | null;
  parentId: string | null;
  children: string[];
  type: 'editor' | 'board' | 'calendar' | 'inbox' | 'tasks' | 'automations' | 'templates';
  isFavorite?: boolean;
};

type AppState = {
  pages: Record<string, Page>;
  activePageId: string | null;
  rootPageIds: string[];
  
  // UI States
  isSearchOpen: boolean;
  isSettingsOpen: boolean;
  
  // Actions
  setActivePage: (id: string) => void;
  setSearchOpen: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  addPage: (parentId: string | null) => string;
  updatePageTitle: (id: string, title: string) => void;
  updatePageContent: (id: string, content: string) => void;
  updatePageIcon: (id: string, icon: string) => void;
  updatePageType: (id: string, type: 'editor' | 'board' | 'calendar' | 'inbox' | 'tasks' | 'automations' | 'templates') => void;
  toggleFavorite: (id: string) => void;
  deletePage: (id: string) => void;
  applyTemplate: (title: string, icon: string, content: string, type: 'editor' | 'board') => void;
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
    }
  },
  activePageId: initialPageId,
  rootPageIds: [initialPageId, 'inbox', 'calendar', 'tasks', 'automations', 'templates'],
  isSearchOpen: false,
  isSettingsOpen: false,
} as Pick<AppState, 'pages' | 'activePageId' | 'rootPageIds' | 'isSearchOpen' | 'isSettingsOpen'>;

export const useAppStore = create<AppState>()((set) => ({
  ...initialState,
  
  setActivePage: (id) => set({ activePageId: id, isSearchOpen: false }),
  setSearchOpen: (isOpen) => set({ isSearchOpen: isOpen }),
  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
  
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

    // Recursively delete children (simplified for this demo)
    // Note: A robust system would traverse and delete all descendants
    
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
    
    // Auto-select another page if the active one was deleted
    let newActiveId = state.activePageId;
    if (newActiveId === id) {
      newActiveId = newRootIds.length > 0 ? newRootIds[0] : null;
    }
    
    return {
      pages: newPages,
      rootPageIds: newRootIds,
      activePageId: newActiveId,
    };
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
  }
}));
