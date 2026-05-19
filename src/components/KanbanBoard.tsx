"use client";
import { useState } from "react";
import styles from "./KanbanBoard.module.css";
import { Plus, MoreHorizontal } from "lucide-react";

type Task = {
  id: string;
  title: string;
  status: string;
};

type Column = {
  id: string;
  title: string;
};

const initialColumns: Column[] = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

const initialTasks: Task[] = [
  { id: "1", title: "Research competitors", status: "todo" },
  { id: "2", title: "Design database schema", status: "todo" },
  { id: "3", title: "Set up Next.js app", status: "in-progress" },
  { id: "4", title: "Implement rich text editor", status: "done" },
];

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [columns] = useState<Column[]>(initialColumns);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === draggedTaskId ? { ...task, status: columnId } : task
      )
    );
    setDraggedTaskId(null);
  };

  const addTask = (columnId: string) => {
    const title = prompt("Task title:");
    if (!title) return;
    const newTask: Task = {
      id: Math.random().toString(),
      title,
      status: columnId,
    };
    setTasks([...tasks, newTask]);
  };

  return (
    <div className={styles.board}>
      {columns.map((column) => (
        <div
          key={column.id}
          className={styles.column}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <div className={styles.columnHeader}>
            <span className={styles.columnTitle}>{column.title}</span>
            <span className={styles.taskCount}>
              {tasks.filter((t) => t.status === column.id).length}
            </span>
            <button className={styles.columnActionBtn}>
              <MoreHorizontal size={14} />
            </button>
            <button className={styles.columnActionBtn} onClick={() => addTask(column.id)}>
              <Plus size={14} />
            </button>
          </div>

          <div className={styles.taskList}>
            {tasks
              .filter((task) => task.status === column.id)
              .map((task) => (
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
                    <div className={styles.tag}>Tag</div>
                  </div>
                </div>
              ))}
            <div
              className={styles.addTaskBtn}
              onClick={() => addTask(column.id)}
            >
              <Plus size={14} /> New
            </div>
          </div>
        </div>
      ))}
      <div className={styles.addColumn}>
        <Plus size={16} /> Add a group
      </div>
    </div>
  );
}
