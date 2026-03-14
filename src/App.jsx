import React, { useState, useEffect } from 'react';
import Calendar from './components/Calendar';
import GanttChart from './components/GanttChart';
import TaskModal from './components/TaskModal';
import BillingSheet from './components/BillingSheet';
import Login from './components/Login';
import { Calendar as CalendarIcon, PieChart, Plus, Sun, Moon, LayoutGrid, LogOut } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function App() {
  const [tasks, setTasks] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingTask, setEditingTask] = useState(null);
  const [viewingTask, setViewingTask] = useState(null);
  const [ganttTask, setGanttTask] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [viewMode, setViewMode] = useState('calendar');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out

  // Track auth state
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null);
      if (firebaseUser && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    });
    return () => unsubAuth();
  }, []);

  // Notification logic & Task Loading
  const notifiedTasks = React.useRef(new Set());
  const seenTaskIds = React.useRef(new Set());
  const isInitialLoad = React.useRef(true);
  const tasksRef = React.useRef([]); // For use inside interval

  useEffect(() => {
    if (!user) return;

    // Separate interval for notifications (only depends on user login)
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const currentTasks = tasksRef.current;
      currentTasks.forEach(task => {
        if (task.isCompleted) return;
        
        const deadline = new Date(task.deadline);
        const diffMs = deadline - now;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = diffMs / 3600000;
        const diffDays = diffMs / 86400000;

        // Assignments: 5 hours before deadline
        if (task.type === 'Assignment') {
          if (diffHours > 0 && diffHours <= 5 && !notifiedTasks.current.has(`${task.id}-5h`)) {
            new Notification("⏳ Assignment Reminder", {
              body: `"${task.title}" is due in ${Math.round(diffHours)} hours!`,
              icon: '/v_fav.png'
            });
            notifiedTasks.current.add(`${task.id}-5h`);
          }
        }

        // Dissertations: 7 days (Yellow) and 3 days (Red)
        if (task.type === 'Dissertation') {
          if (diffDays > 3 && diffDays <= 7 && !notifiedTasks.current.has(`${task.id}-7d`)) {
            new Notification("🟡 Dissertation Warning", {
              body: `"${task.title}" has 7 days left to reach Yellow status!`,
              icon: '/v_fav.png'
            });
            notifiedTasks.current.add(`${task.id}-7d`);
          }
          if (diffDays > 0 && diffDays <= 3 && !notifiedTasks.current.has(`${task.id}-3d`)) {
            new Notification("🔴 Dissertation Urgent", {
              body: `"${task.title}" is now in the RED zone (3 days left)!`,
              icon: '/v_fav.png'
            });
            notifiedTasks.current.add(`${task.id}-3d`);
          }
        }

        if (diffMins < 0 && !notifiedTasks.current.has(`${task.id}-overdue`)) {
          new Notification("🚨 Task Overdue!", {
            body: `"${task.title}" has passed its deadline!`,
            icon: '/v_fav.png'
          });
          notifiedTasks.current.add(`${task.id}-overdue`);
        }
      });
    }, 60000);

    const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
      const dbTasks = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        dbTasks.push(data);

        if (!isInitialLoad.current && !seenTaskIds.current.has(data.id)) {
          new Notification("🆕 New Task Added", {
            body: `${data.title} (${data.type})`,
            icon: '/v_fav.png'
          });
        }
        seenTaskIds.current.add(data.id);
      });
      
      isInitialLoad.current = false;
      tasksRef.current = dbTasks; // Update ref for the interval
      setTasks(dbTasks);
      setGanttTask(prev => prev ? dbTasks.find(t => t.id === prev.id) || null : null);
      setViewingTask(prev => prev ? dbTasks.find(t => t.id === prev.id) || null : null);
    }, (error) => {
      console.error("Firebase connection error:", error);
    });

    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  }, [isDarkMode]);

  const handleTaskSave = async (updatedTask) => {
    if (!updatedTask.id) {
      updatedTask.id = Date.now().toString();
    }

    setTasks(prev => {
      const exists = prev.find(t => t.id === updatedTask.id);
      if (exists) return prev.map(t => t.id === updatedTask.id ? updatedTask : t);
      return [...prev, updatedTask];
    });

    setEditingTask(null);

    try {
      await setDoc(doc(db, "tasks", updatedTask.id), updatedTask);
    } catch (error) {
      console.error("Error saving to Firebase:", error);
      alert("Failed to save task to database. Please check your connection.");
    }
  };

  const handleTaskDelete = async (taskId) => {
    if (window.confirm("Are you sure you want to permanently delete this task?")) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setEditingTask(null);
      setViewingTask(null);
      if (ganttTask?.id === taskId) setGanttTask(null);

      try {
        await deleteDoc(doc(db, "tasks", taskId));
      } catch (error) {
        console.error("Error deleting from Firebase:", error);
      }
    }
  };

  const handleCreateTask = () => {
    setEditingTask({
      ticketId: '',
      title: '',
      type: 'Assignment',
      taskFormat: 'Doc',
      deadline: new Date().toISOString(),
      wordCountTarget: 0,
      notes: '',
      taskLink: '',
      aiTool: 'None',
      linkedAccount: '@speakvishal4',
      parts: []
    });
  };

  // Loading state
  if (user === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Loading...</div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Login />;
  }

  return (
    <div className="dashboard-container">
      <header className="main-header">
        <div className="header-left">
          <h1>
            <CalendarIcon size={24} color="var(--primary-color)" />
            <span>Academic Task Management</span>
          </h1>
        </div>
        <div className="header-right">
          <div className="time-display">
            <span className="date-str">{currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span className="time-str">{currentTime.toLocaleTimeString()}</span>
          </div>
          <div className="view-switcher">
            <button className={viewMode === 'calendar' ? 'active' : ''} onClick={() => setViewMode('calendar')}>Calendar</button>
            <button className={viewMode === 'billing' ? 'active' : ''} onClick={() => setViewMode('billing')}>Billing Grid</button>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)} aria-label="Toggle Theme">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="btn btn-primary add-btn" onClick={handleCreateTask}>
              <Plus size={18} /> <span className="btn-text">Add Task</span>
            </button>
            <button className="btn btn-secondary logout-btn" onClick={() => signOut(auth)} title="Sign Out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main style={{display: 'flex', flexDirection: 'column', gap: '3rem', marginTop: '1rem'}}>
        {viewMode === 'calendar' ? (
          <>
            <section>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem'}}>
                <CalendarIcon size={20} color="var(--primary-color)" />
                <h2 className="section-title" style={{margin: 0}}>Task Calendar</h2>
              </div>
              <Calendar
                currentMonth={currentMonth}
                onDateChange={setCurrentMonth}
                tasks={tasks}
                onTaskClick={setGanttTask}
                onInfoClick={setViewingTask}
                onEditClick={setEditingTask}
              />
            </section>

            {ganttTask && ganttTask.type === 'Dissertation' && ganttTask.parts?.length > 0 && (
              <section>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem'}}>
                  <PieChart size={20} color="var(--yellow-tag-text)" />
                  <h2 className="section-title" style={{margin: 0}}>Gantt Chart: {ganttTask.title}</h2>
                </div>
                <GanttChart task={ganttTask} />
              </section>
            )}
          </>
        ) : (
          <section>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem'}}>
              <LayoutGrid size={20} color="var(--primary-color)" />
              <h2 className="section-title" style={{margin: 0}}>Billing Sheet (Completed)</h2>
            </div>
            <BillingSheet tasks={tasks} />
          </section>
        )}
      </main>

      {editingTask && (
        <TaskModal
          task={editingTask}
          mode="edit"
          onClose={() => setEditingTask(null)}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
        />
      )}

      {viewingTask && (
        <TaskModal
          task={viewingTask}
          mode="view"
          onClose={() => setViewingTask(null)}
        />
      )}
    </div>
  );
}

export default App;
