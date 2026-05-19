import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import styles from './DatabaseRowModal.module.css';
import { X } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

export default function DatabaseRowModal({ dbId, rowId, onClose }: { dbId: string; rowId: string; onClose: () => void }) {
  const { databases, updateCell, updateRowContent } = useAppStore();
  const db = databases[dbId];
  const row = db?.rows.find((r: any) => r.id === rowId);
  const titleCol = db?.columns[0];
  const properties = db?.columns.slice(1) || [];

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Press "/" for commands or start typing...',
      }),
    ],
    content: row?.pageContent || '',
    onUpdate: ({ editor }) => {
      updateRowContent(dbId, rowId, editor.getHTML());
    },
  });

  if (!db || !row || !titleCol) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <div className={styles.content}>
          <input 
            className={styles.titleInput}
            value={row.cells[titleCol.id] || ''}
            onChange={(e) => updateCell(dbId, rowId, titleCol.id, e.target.value)}
            placeholder="Untitled"
          />

          {properties.length > 0 && (
            <div className={styles.properties}>
              {properties.map((col: any) => (
                <div key={col.id} className={styles.propertyRow}>
                  <div className={styles.propertyLabel}>{col.name}</div>
                  <div className={styles.propertyValue}>
                    <input 
                      className={styles.propertyInput}
                      value={row.cells[col.id] || ''}
                      onChange={(e) => updateCell(dbId, rowId, col.id, e.target.value)}
                      placeholder="Empty"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.editorWrapper}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}
