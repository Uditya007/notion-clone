"use client";
import styles from './Views.module.css';
import { CheckSquare, Plus, Clock } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

export default function TasksView() {
  const { tasks, addTask, toggleTask } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleAddSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      addTask(newTaskTitle.trim(), 'No due date');
      setNewTaskTitle('');
      setIsAdding(false);
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTaskTitle('');
    }
  };

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
              onKeyDown={handleAddSubmit}
              onBlur={() => {
                if (newTaskTitle.trim()) {
                  addTask(newTaskTitle.trim(), 'No due date');
                }
                setIsAdding(false);
                setNewTaskTitle('');
              }}
            />
          </div>
        )}

        <div className={styles.taskGroup}>
          <h3 className={styles.taskGroupTitle}>To Do</h3>
          {tasks.filter(t => !t.completed).map(task => (
            <div key={task.id} className={styles.taskListItem}>
              <button 
                className={`${styles.checkbox} ${task.completed ? styles.checked : ''}`}
                onClick={() => toggleTask(task.id)}
              />
              <div className={styles.taskItemContent}>
                <span className={styles.taskItemTitle}>{task.title}</span>
                <span className={`${styles.taskItemDue} ${task.due === 'Overdue' ? styles.overdue : ''}`}>
                  <Clock size={12} /> {task.due}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.taskGroup}>
          <h3 className={styles.taskGroupTitle}>Completed</h3>
          {tasks.filter(t => t.completed).map(task => (
            <div key={task.id} className={`${styles.taskListItem} ${styles.taskCompleted}`}>
              <button 
                className={`${styles.checkbox} ${styles.checked}`}
                onClick={() => toggleTask(task.id)}
              />
              <div className={styles.taskItemContent}>
                <span className={styles.taskItemTitle}>{task.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
