"use client";

import styles from './Views.module.css';
import { CheckSquare, Plus, Clock, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function TasksView() {
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasksList(data);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel('realtime:tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddTask = async (title: string) => {
    if (!title.trim()) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentCompleted }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTask(newTaskTitle);
      setNewTaskTitle('');
      setIsAdding(false);
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTaskTitle('');
    }
  };

  const handleBlur = () => {
    if (newTaskTitle.trim()) {
      handleAddTask(newTaskTitle);
    }
    setIsAdding(false);
    setNewTaskTitle('');
  };

  const incompleteTasks = tasksList.filter(t => !t.completed);
  const completedTasks = tasksList.filter(t => t.completed);

  return (
    <div className={styles.viewContainer}>
      <div className={styles.viewHeader}>
        <div className={styles.viewTitleWrapper}>
          <CheckSquare className={styles.viewIcon} size={24} />
          <h2>My Tasks</h2>
        </div>
      </div>

      <div className={styles.taskListContainer}>
        {!isAdding ? (
          <button className={styles.addTaskLargeBtn} onClick={() => setIsAdding(true)}>
            <Plus size={16} /> Add new task
          </button>
        ) : (
          <div className={styles.addTaskInputWrapper}>
            <div className={styles.checkbox} />
            <input 
              autoFocus
              className={styles.addTaskInput}
              placeholder="What needs to be done? (Press Enter to save)"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
            />
          </div>
        )}

        <div className={styles.taskGroup}>
          <h3 className={styles.taskGroupTitle}>To Do</h3>
          {incompleteTasks.map(task => (
            <div key={task.id} className={styles.taskListItem}>
              <button 
                className={`${styles.checkbox} ${task.completed ? styles.checked : ''}`}
                onClick={() => handleToggleTask(task.id, task.completed)}
              />
              <div className={styles.taskItemContent}>
                <span className={styles.taskItemTitle}>{task.title}</span>
                <span className={`${styles.taskItemDue} ${task.due === 'Overdue' ? styles.overdue : ''}`}>
                  <Clock size={12} /> {task.due || 'No due date'}
                </span>
              </div>
              <button className={styles.deleteTaskBtn} onClick={() => handleDeleteTask(task.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className={styles.taskGroup}>
          <h3 className={styles.taskGroupTitle}>Completed</h3>
          {completedTasks.map(task => (
            <div key={task.id} className={`${styles.taskListItem} ${styles.taskCompleted}`}>
              <button 
                className={`${styles.checkbox} ${styles.checked}`}
                onClick={() => handleToggleTask(task.id, task.completed)}
              />
              <div className={styles.taskItemContent}>
                <span className={styles.taskItemTitle}>{task.title}</span>
              </div>
              <button className={styles.deleteTaskBtn} onClick={() => handleDeleteTask(task.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
