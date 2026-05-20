"use client";

import { useEffect, useState } from "react";
import styles from "./KanbanBoard.module.css";
import { Plus, MoreHorizontal, Trash2, Eye, FileText, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface KanbanTask {
  id: string; // "checklist-{index}" or global task ID
  title: string;
  status: "todo" | "in-progress" | "done";
  type: "checklist" | "global";
  index?: number; // index in checklist items
  completed: boolean;
}

interface KanbanBoardProps {
  pageId: string;
  initialContent: string;
  onUpdateContent: (newContent: string) => void;
}

type Column = {
  id: "todo" | "in-progress" | "done";
  title: string;
};

const COLUMNS: Column[] = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

export default function KanbanBoard({ pageId, initialContent, onUpdateContent }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"all" | "checklist" | "global">("all");

  // Parse Tiptap checklists from HTML string
  const parseChecklists = (html: string): KanbanTask[] => {
    if (typeof window === "undefined" || !html) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const listItems = doc.querySelectorAll("li[data-type='taskItem']");
    const parsed: KanbanTask[] = [];

    listItems.forEach((li, idx) => {
      const completed = li.getAttribute("data-checked") === "true";
      const statusAttr = li.getAttribute("data-status") as KanbanTask["status"] | null;
      const status: KanbanTask["status"] = statusAttr || (completed ? "done" : "todo");
      const title = li.textContent?.trim() || `Task ${idx + 1}`;

      parsed.push({
        id: `checklist-${idx}`,
        title,
        status,
        type: "checklist",
        index: idx,
        completed,
      });
    });

    return parsed;
  };

  // Fetch global tasks from table
  const fetchGlobalTasks = async (): Promise<KanbanTask[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        return data.map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.completed ? "done" : "todo", // standard tasks use completed status
          type: "global",
          completed: t.completed,
        }));
      }
    } catch (e) {
      console.error("Error fetching global tasks:", e);
    }
    return [];
  };

  const loadAllTasks = async () => {
    const localChecklist = parseChecklists(initialContent);
    const globalTasks = await fetchGlobalTasks();
    
    // Combine them dynamically
    const combined = [...localChecklist, ...globalTasks];
    setTasks(combined);
  };

  useEffect(() => {
    loadAllTasks();
  }, [initialContent, pageId]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, columnId: "todo" | "in-progress" | "done") => {
    e.preventDefault();
    if (!draggedTaskId) return;

    const taskToMove = tasks.find((t) => t.id === draggedTaskId);
    if (!taskToMove) return;

    if (taskToMove.type === "checklist" && typeof taskToMove.index === "number") {
      // 1. Update checklist HTML content in current page
      if (typeof window !== "undefined") {
        const parser = new DOMParser();
        const doc = parser.parseFromString(initialContent, "text/html");
        const listItems = doc.querySelectorAll("li[data-type='taskItem']");
        const targetLi = listItems[taskToMove.index];

        if (targetLi) {
          targetLi.setAttribute("data-checked", columnId === "done" ? "true" : "false");
          targetLi.setAttribute("data-status", columnId);
          onUpdateContent(doc.body.innerHTML);
        }
      }
    } else if (taskToMove.type === "global") {
      // 2. Update global task table status in Supabase
      try {
        const completed = columnId === "done";
        await fetch(`/api/tasks/${taskToMove.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed }),
        });
      } catch (err) {
        console.error("Failed to update global task:", err);
      }
    }

    // Instantly update local state for fast feedback
    setTasks((prev) =>
      prev.map((task) =>
        task.id === draggedTaskId ? { ...task, status: columnId, completed: columnId === "done" } : task
      )
    );
    setDraggedTaskId(null);
  };

  const handleAddTask = async (columnId: "todo" | "in-progress" | "done") => {
    const title = prompt("Enter task title:");
    if (!title?.trim()) return;

    if (viewType === "global") {
      // Create as global task
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (res.ok) {
          loadAllTasks();
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      // Append to the bottom of the page's HTML document content
      if (typeof window !== "undefined") {
        const parser = new DOMParser();
        const doc = parser.parseFromString(initialContent, "text/html");
        
        // Find existing task list or create new one
        let taskList = doc.querySelector("ul[data-type='taskList']");
        if (!taskList) {
          taskList = doc.createElement("ul");
          taskList.setAttribute("data-type", "taskList");
          doc.body.appendChild(taskList);
        }

        const newLi = doc.createElement("li");
        newLi.setAttribute("data-type", "taskItem");
        newLi.setAttribute("data-checked", columnId === "done" ? "true" : "false");
        newLi.setAttribute("data-status", columnId);
        newLi.textContent = title;
        
        taskList.appendChild(newLi);
        onUpdateContent(doc.body.innerHTML);
      }
    }
  };

  const handleDeleteTask = async (task: KanbanTask) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    if (task.type === "checklist" && typeof task.index === "number") {
      if (typeof window !== "undefined") {
        const parser = new DOMParser();
        const doc = parser.parseFromString(initialContent, "text/html");
        const listItems = doc.querySelectorAll("li[data-type='taskItem']");
        const targetLi = listItems[task.index];
        if (targetLi) {
          targetLi.remove();
          onUpdateContent(doc.body.innerHTML);
        }
      }
    } else if (task.type === "global") {
      try {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          loadAllTasks();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (viewType === "checklist") return t.type === "checklist";
    if (viewType === "global") return t.type === "global";
    return true;
  });

  return (
    <div className={styles.boardContainer}>
      <div className={styles.boardHeaderFilter}>
        <span className={styles.filterTitle}>Display Filter:</span>
        <button 
          className={`${styles.filterBtn} ${viewType === "all" ? styles.filterBtnActive : ""}`}
          onClick={() => setViewType("all")}
        >
          All Tasks
        </button>
        <button 
          className={`${styles.filterBtn} ${viewType === "checklist" ? styles.filterBtnActive : ""}`}
          onClick={() => setViewType("checklist")}
        >
          <FileText size={12} style={{ display: 'inline', marginRight: 4 }} /> Document Checklist
        </button>
        <button 
          className={`${styles.filterBtn} ${viewType === "global" ? styles.filterBtnActive : ""}`}
          onClick={() => setViewType("global")}
        >
          <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} /> Global Tasks
        </button>
      </div>

      <div className={styles.board}>
        {COLUMNS.map((column) => {
          const colTasks = filteredTasks.filter((t) => t.status === column.id);
          return (
            <div
              key={column.id}
              className={styles.column}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className={styles.columnHeader}>
                <span className={styles.columnTitle}>{column.title}</span>
                <span className={styles.taskCount}>{colTasks.length}</span>
                <button 
                  className={styles.columnActionBtn}
                  onClick={() => handleAddTask(column.id)}
                  title="Create new task card"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className={styles.taskList}>
                {colTasks.length === 0 ? (
                  <div className={styles.emptyColumnPlaceholder}>
                    Drag tasks here or click + to add
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`${styles.taskCard} ${
                        draggedTaskId === task.id ? styles.dragging : ""
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                    >
                      <div className={styles.taskTitle}>{task.title}</div>
                      <div className={styles.taskMeta}>
                        <span 
                          className={`${styles.tag} ${
                            task.type === "checklist" ? styles.tagChecklist : styles.tagGlobal
                          }`}
                        >
                          {task.type === "checklist" ? "Checklist" : "Global Task"}
                        </span>
                        
                        <button 
                          className={styles.deleteCardBtn}
                          onClick={() => handleDeleteTask(task)}
                          title="Delete Task"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <div
                  className={styles.addTaskBtn}
                  onClick={() => handleAddTask(column.id)}
                >
                  <Plus size={14} /> Add new card
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
