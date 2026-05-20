"use client";

import { useEffect, useState, useRef } from 'react';
import stylesModule from './DatabaseRowModal.module.css';
import { X } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { supabase } from '@/lib/supabase/client';

export default function DatabaseRowModal({ dbId, rowId, onClose }: { dbId: string; rowId: string; onClose: () => void }) {
  const [db, setDb] = useState<any>(null);
  const [row, setRow] = useState<any>(null);

  const fetchDatabase = async () => {
    try {
      const res = await fetch(`/api/databases?pageId=${dbId}`);
      if (res.ok) {
        const data = await res.json();
        setDb(data);
        const currentRow = data.rows.find((r: any) => r.id === rowId);
        setRow(currentRow);
      }
    } catch (err) {
      console.error("Error loading db inside modal:", err);
    }
  };

  useEffect(() => {
    fetchDatabase();

    const channel = supabase
      .channel(`realtime:row:${rowId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'db_rows', filter: `id=eq.${rowId}` }, (payload: any) => {
        setRow(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dbId, rowId]);

  const handleUpdateCell = async (columnId: string, value: string) => {
    setRow((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        cells: { ...prev.cells, [columnId]: value }
      };
    });

    try {
      await fetch('/api/databases', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateCell', dbId, rowId, columnId, value }),
      });
    } catch (err) {
      console.error("Error updating cell:", err);
    }
  };

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerDebouncedSaveContent = (htmlContent: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/databases', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateRow',
            dbId,
            rowId,
            updates: { page_content: htmlContent }
          }),
        });
      } catch (err) {
        console.error("Error saving row content:", err);
      }
    }, 1000);
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Press "/" for commands or start typing...',
      }),
    ],
    content: row?.page_content || row?.pageContent || '',
    onUpdate: ({ editor }) => {
      triggerDebouncedSaveContent(editor.getHTML());
    },
  });

  useEffect(() => {
    const currentVal = row.page_content || row.pageContent || '';
    if (editor && editor.getHTML() !== currentVal) {
      editor.commands.setContent(currentVal);
    }
  }, [row, editor]);

  if (!db || !row) return null;

  const titleCol = db.columns[0];
  const properties = db.columns.slice(1) || [];

  return (
    <div className={stylesModule.overlay} onClick={onClose}>
      <div className={stylesModule.modal} onClick={e => e.stopPropagation()}>
        <div className={stylesModule.header}>
          <button className={stylesModule.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <div className={stylesModule.content}>
          <input 
            className={stylesModule.titleInput}
            value={row.cells[titleCol.id] || ''}
            onChange={(e) => handleUpdateCell(titleCol.id, e.target.value)}
            placeholder="Untitled"
          />

          {properties.length > 0 && (
            <div className={stylesModule.properties}>
              {properties.map((col: any) => (
                <div key={col.id} className={stylesModule.propertyRow}>
                  <div className={stylesModule.propertyLabel}>{col.name}</div>
                  <div className={stylesModule.propertyValue}>
                    <input 
                      className={stylesModule.propertyInput}
                      value={row.cells[col.id] || ''}
                      onChange={(e) => handleUpdateCell(col.id, e.target.value)}
                      placeholder="Empty"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={stylesModule.editorWrapper}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}
