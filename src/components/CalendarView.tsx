"use client";
import styles from './CalendarView.module.css';
import { Calendar as CalendarIcon, Clock, Users, Plus, ChevronLeft, ChevronRight, Video, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

type CalendarEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type: 'meeting' | 'task' | 'milestone' | 'default';
  description?: string;
  meetLink?: string;
  htmlLink?: string;
};

export default function CalendarView() {
  const [isConnected, setIsConnected] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('google_calendar_connected') === 'true';
    }
    return false;
  });
  const [connectedEmail, setConnectedEmail] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('google_calendar_email');
    }
    return null;
  });
  const [view, setView] = useState<'Month' | 'Week' | 'Day'>('Month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cached_calendar_events');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkConnectionStatus = async () => {
    try {
      const res = await fetch('/api/google/connect');
      if (res.ok) {
        const data = await res.json();
        if (data?.connected) {
          setIsConnected(true);
          setConnectedEmail(data.email);
          localStorage.setItem('google_calendar_connected', 'true');
          if (data.email) {
            localStorage.setItem('google_calendar_email', data.email);
          }
          return true;
        }
      }
    } catch (err) {
      console.error(err);
    }
    setIsConnected(false);
    setConnectedEmail(null);
    localStorage.removeItem('google_calendar_connected');
    localStorage.removeItem('google_calendar_email');
    return false;
  };

  const handleConnectGoogle = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          },
          scopes: 'email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.modify'
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to connect Google Account');
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/google/connect', { method: 'DELETE' });
      if (res.ok) {
        setIsConnected(false);
        setConnectedEmail(null);
        setEvents([]);
        localStorage.removeItem('google_calendar_connected');
        localStorage.removeItem('google_calendar_email');
        localStorage.removeItem('cached_calendar_events');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // New Event Form State
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('10:00');
  const [newEventEndTime, setNewEventEndTime] = useState('11:00');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [createGoogleMeet, setCreateGoogleMeet] = useState(false);

  const openNewEventModal = (dateStr?: string) => {
    const defaultDate = dateStr || formatDateStr(new Date());
    setNewEventDate(defaultDate);
    setIsAddingEvent(true);
  };

  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventDate) return;

    setIsLoading(true);
    try {
      const startDateTime = new Date(`${newEventDate}T${newEventStartTime}:00`).toISOString();
      const endDateTime = new Date(`${newEventDate}T${newEventEndTime}:00`).toISOString();

      const body: any = {
        summary: newEventTitle,
        description: newEventDescription,
        start: { dateTime: startDateTime },
        end: { dateTime: endDateTime },
      };

      if (createGoogleMeet) {
        body.conferenceData = {
          createRequest: {
            requestId: `clearspace-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        };
      }

      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to create event');
      
      // Reset form
      setNewEventTitle('');
      setNewEventDescription('');
      setNewEventStartTime('10:00');
      setNewEventEndTime('11:00');
      setCreateGoogleMeet(false);
      setIsAddingEvent(false);

      // Re-fetch events
      fetchEvents();
    } catch (error) {
      console.error(error);
      alert('Failed to add event to Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    
    // Fetch events for the current month +/- 1 month
    const timeMin = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString();
    const timeMax = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString();
    
    try {
      const res = await fetch(`/api/calendar/events?timeMin=${timeMin}&timeMax=${timeMax}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      
      const mappedEvents: CalendarEvent[] = (data.items || []).map((item: any) => {
        const start = item.start.dateTime || item.start.date;
        const dateObj = new Date(start);
        const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        
        let time;
        if (item.start.dateTime) {
          time = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        }

        let meetLink;
        if (item.conferenceData?.entryPoints) {
          const videoEntry = item.conferenceData.entryPoints.find((e: any) => e.entryPointType === 'video');
          if (videoEntry) meetLink = videoEntry.uri;
        } else if (item.hangoutLink) {
          meetLink = item.hangoutLink;
        }

        return {
          id: item.id,
          title: item.summary || 'Untitled Event',
          date: dateStr,
          time,
          type: meetLink ? 'meeting' : 'default',
          description: item.description,
          meetLink,
          htmlLink: item.htmlLink
        };
      });
      setEvents(mappedEvents);
      localStorage.setItem('cached_calendar_events', JSON.stringify(mappedEvents));
    } catch (e) {
      console.error(e);
      setError('Unable to load calendar events. Try logging out and reconnecting your Google Account to refresh your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const connected = await checkConnectionStatus();
      if (connected) {
        fetchEvents();
      }
    };
    init();
  }, [currentDate]);

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

  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 24 }, (_, i) => {
    if (i === 0) return '12 AM';
    if (i === 12) return '12 PM';
    return i < 12 ? `${i} AM` : `${i - 12} PM`;
  });

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

  const handleDrop = async (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    if (draggedEventId) {
      // Optimistic UI update
      setEvents(events.map(ev => 
        ev.id === draggedEventId ? { ...ev, date: targetDateStr } : ev
      ));
      
      // Real API update
      const evToUpdate = events.find(e => e.id === draggedEventId);
      if (evToUpdate && isConnected) {
        try {
          // If it had a specific time, we need to preserve the time but change the date
          let newStart;
          if (evToUpdate.time) {
             const [time, modifier] = evToUpdate.time.split(' ');
             let [hours, minutes] = time.split(':');
             if (hours === '12') hours = '00';
             if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12);
             newStart = { dateTime: `${targetDateStr}T${hours}:${minutes}:00Z` };
          } else {
             newStart = { date: targetDateStr };
          }

          await fetch('/api/calendar/events', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId: draggedEventId,
              start: newStart,
              // End time also needs adjusting in a real app, keeping it simple here
            })
          });
        } catch (error) {
          console.error("Failed to update event", error);
        }
      }
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
          <button className={styles.primaryBtn} onClick={() => openNewEventModal()}>
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
          <div className={styles.noticeDot} style={{ backgroundColor: isConnected ? '#10b981' : '#a1a1aa' }} />
          <span>{isConnected ? `Synced with ${connectedEmail || 'Google Calendar'}` : 'Not connected'}</span>
        </div>
      </div>

      {!isConnected ? (
        <div className={styles.emptyStateContainer} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <CalendarIcon size={48} opacity={0.2} />
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Connect Google Calendar</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '300px', textAlign: 'center' }}>
            Sync your real events and manage your schedule directly inside Clearspace.
          </p>
          <button 
            onClick={handleConnectGoogle}
            style={{ padding: '8px 16px', background: 'var(--text-main)', color: 'var(--bg-main)', borderRadius: '6px', fontWeight: 500, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            Connect Google Account
          </button>
        </div>
      ) : error ? (
        <div className={styles.emptyStateContainer} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <CalendarIcon size={48} opacity={0.2} />
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Connection Issue</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '350px', textAlign: 'center' }}>
            {error}
          </p>
          <button 
            onClick={handleDisconnectGoogle}
            style={{ padding: '8px 16px', background: 'var(--text-main)', color: 'var(--bg-main)', borderRadius: '6px', fontWeight: 500, fontSize: '14px', cursor: 'pointer', border: 'none' }}
          >
            Sign Out & Reconnect
          </button>
        </div>
      ) : (
        <>
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
                onClick={() => openNewEventModal(dateStr)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.dayNumber}>{date.getDate()}</div>
                <div className={styles.dayEventsList}>
                  {dayEvents.map(event => (
                    <div 
                      key={event.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, event.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      className={`${styles.eventChip} ${styles[event.type] || styles.default}`}
                      style={{ backgroundColor: event.type === 'meeting' ? 'rgba(35, 131, 226, 0.15)' : 'var(--bg-hover)' }}
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
        <div className={styles.scrollWrapper}>
          <div className={styles.dayViewGrid}>
            <div className={styles.timeColumn}>
              <div className={styles.timeSlotEmpty} />
              {hours.map(hour => (
                <div key={hour} className={styles.timeSlot}>{hour}</div>
              ))}
            </div>
            <div 
              className={styles.dayEventsColumn}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, formatDateStr(currentDate))}
            >
              <div className={styles.dayEventsContainer}>
                 {events.filter(e => e.date === formatDateStr(currentDate)).map(event => (
                   <div 
                     key={event.id}
                     draggable
                     onDragStart={(e) => handleDragStart(e, event.id)}
                     className={`${styles.eventCard} ${styles[event.type]}`}
                   >
                     <div className={styles.eventTitle}>{event.title}</div>
                     <div className={styles.eventDetails}>
                       {event.time && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12}/> {event.time}</span>}
                     </div>
                   </div>
                 ))}
              </div>
              
              <div className={styles.gridLines}>
                {hours.map(hour => (
                  <div key={hour} className={styles.gridLine} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {view === 'Week' && (
        <div className={styles.scrollWrapper}>
          <div className={styles.weekGrid}>
            <div className={styles.timeColumn}>
              <div className={styles.timeSlotEmpty} />
              {hours.map(hour => (
                <div key={hour} className={styles.timeSlot}>{hour}</div>
              ))}
            </div>
            {weekDays.map(day => {
              const dateStr = formatDateStr(day);
              const dayEvents = events.filter(e => e.date === dateStr);
              const isToday = dateStr === formatDateStr(new Date());
              
              return (
                <div key={dateStr} className={`${styles.dayColumn} ${isToday ? styles.todayColumn : ''}`}>
                  <div className={styles.dayColumnHeader}>
                    <div className={styles.dayColumnName}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getDay()]}</div>
                    <div className={`${styles.dayColumnNumber} ${isToday ? styles.todayNumber : ''}`}>{day.getDate()}</div>
                  </div>
                  <div 
                    className={styles.dayColumnBody}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, dateStr)}
                  >
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
                    <div className={styles.gridLines}>
                      {hours.map(hour => (
                        <div key={hour} className={styles.gridLine} />
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      </>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            style={{ width: '400px', backgroundColor: 'var(--bg-main)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>{selectedEvent.title}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', fontSize: '14px' }}>
              <div style={{ display: 'flex', gap: '8px', color: 'var(--text-muted)' }}>
                <Clock size={16} /> 
                <span>{selectedEvent.date} {selectedEvent.time ? `at ${selectedEvent.time}` : ''}</span>
              </div>
              
              {selectedEvent.meetLink && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Video size={16} color="var(--primary)" /> 
                  <a href={selectedEvent.meetLink} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 500 }}>
                     Join Google Meet
                  </a>
                </div>
              )}

              {selectedEvent.htmlLink && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <ExternalLink size={16} color="var(--text-muted)" /> 
                  <a href={selectedEvent.htmlLink} target="_blank" rel="noreferrer" style={{ color: 'var(--text-main)', textDecoration: 'underline' }}>
                    View in Calendar
                  </a>
                </div>
              )}
            </div>

            <button 
              onClick={() => setSelectedEvent(null)}
              style={{ width: '100%', padding: '8px', background: 'var(--bg-hover)', color: 'var(--text-main)', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* Create Event Modal */}
      {isAddingEvent && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          onClick={() => setIsAddingEvent(false)}
        >
          <form 
            onSubmit={handleCreateEventSubmit}
            style={{ width: '420px', backgroundColor: 'var(--bg-main)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '16px' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-main)' }}>Create New Event</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>Event Title</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Design Sync"
                value={newEventTitle}
                onChange={e => setNewEventTitle(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>Date</label>
              <input 
                type="date" 
                required
                value={newEventDate}
                onChange={e => setNewEventDate(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>Start Time</label>
                <input 
                  type="time" 
                  required
                  value={newEventStartTime}
                  onChange={e => setNewEventStartTime(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>End Time</label>
                <input 
                  type="time" 
                  required
                  value={newEventEndTime}
                  onChange={e => setNewEventEndTime(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>Description (Optional)</label>
              <textarea 
                placeholder="Add meeting agenda or notes..."
                value={newEventDescription}
                onChange={e => setNewEventDescription(e.target.value)}
                rows={3}
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', fontSize: '14px', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
              <input 
                type="checkbox" 
                id="googleMeetCheckbox"
                checked={createGoogleMeet}
                onChange={e => setCreateGoogleMeet(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="googleMeetCheckbox" style={{ fontSize: '14px', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Video size={16} color="var(--primary)" /> Generate Google Meet Link
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button 
                type="button"
                onClick={() => setIsAddingEvent(false)}
                style={{ flex: 1, padding: '10px', background: 'var(--bg-hover)', color: 'var(--text-main)', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 500 }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                style={{ flex: 1, padding: '10px', background: 'var(--text-main)', color: 'var(--bg-main)', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Create Event
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
