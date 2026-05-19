"use client";
import styles from './CalendarView.module.css';
import { Calendar as CalendarIcon, Clock, Users, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

type CalendarEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type: 'meeting' | 'task' | 'milestone';
};

export default function CalendarView() {
  const [view, setView] = useState<'Month' | 'Week' | 'Day'>('Month');
  
  // Start with today's date context
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [events, setEvents] = useState<CalendarEvent[]>([
    { id: '1', title: 'Product Launch', date: '2026-05-21', type: 'milestone' },
    { id: '2', title: 'Design Review', date: '2026-05-19', time: '1:00 PM', type: 'meeting' },
    { id: '3', title: 'Weekly Sync', date: '2026-05-20', time: '10:00 AM', type: 'meeting' },
    { id: '4', title: 'Fix CSS Bug', date: '2026-05-22', type: 'task' },
  ]);

  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);

  // Helper to generate a calendar grid
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  
  // Pad the beginning of the grid so the 1st falls on the correct day of the week
  const firstDayOfMonth = daysInMonth[0].getDay();
  const paddingDays = Array.from({ length: firstDayOfMonth }).fill(null);

  const prevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedEventId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // allow drop
  };

  const handleDrop = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    if (draggedEventId) {
      setEvents(events.map(ev => 
        ev.id === draggedEventId ? { ...ev, date: targetDateStr } : ev
      ));
    }
    setDraggedEventId(null);
  };

  const formatDateStr = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className={styles.viewContainer}>
      <div className={styles.viewHeader}>
        <div className={styles.viewTitleWrapper}>
          <CalendarIcon className={styles.viewIcon} size={24} />
          <h2>Calendar</h2>
        </div>
        <div className={styles.headerControls}>
          <div className={styles.viewToggles}>
            {['Month', 'Week', 'Day'].map(v => (
              <button 
                key={v}
                className={`${styles.viewToggleBtn} ${view === v ? styles.active : ''}`}
                onClick={() => setView(v as any)}
              >
                {v}
              </button>
            ))}
          </div>
          <button className={styles.primaryBtn}>
            <Plus size={16} /> New Event
          </button>
        </div>
      </div>

      <div className={styles.calendarToolbar}>
        <div className={styles.dateNav}>
          <button className={styles.navBtn} onClick={prevMonth}><ChevronLeft size={18} /></button>
          <button className={styles.navBtn} onClick={nextMonth}><ChevronRight size={18} /></button>
          <button className={styles.todayBtn} onClick={goToday}>Today</button>
          <span className={styles.currentMonthLabel}>
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        
        <div className={styles.integrationNotice}>
          <div className={styles.noticeDot} />
          <span>Synced with uditya@example.com</span>
        </div>
      </div>

      {view === 'Month' && (
        <div className={styles.monthGrid}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className={styles.weekdayHeader}>{day}</div>
          ))}
          
          {paddingDays.map((_, i) => (
            <div key={`pad-${i}`} className={styles.dayCellEmpty} />
          ))}
          
          {daysInMonth.map(date => {
            const dateStr = formatDateStr(date);
            const dayEvents = events.filter(e => e.date === dateStr);
            const isToday = dateStr === formatDateStr(new Date());

            return (
              <div 
                key={dateStr} 
                className={`${styles.dayCell} ${isToday ? styles.todayCell : ''}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, dateStr)}
              >
                <div className={styles.dayNumber}>{date.getDate()}</div>
                <div className={styles.dayEventsList}>
                  {dayEvents.map(event => (
                    <div 
                      key={event.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, event.id)}
                      className={`${styles.eventChip} ${styles[event.type]}`}
                    >
                      {event.time && <span className={styles.eventChipTime}>{event.time}</span>}
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'Day' && (
        <div className={styles.dayViewNotice}>
          <Clock size={24} />
          <p>Day view is focused on granular hourly scheduling.</p>
          <p className={styles.subtext}>Switch back to Month view to try drag-and-drop rescheduling!</p>
        </div>
      )}
      
      {view === 'Week' && (
        <div className={styles.dayViewNotice}>
          <CalendarIcon size={24} />
          <p>Week view breaks down your next 7 days.</p>
          <p className={styles.subtext}>Switch back to Month view to try drag-and-drop rescheduling!</p>
        </div>
      )}
    </div>
  );
}
