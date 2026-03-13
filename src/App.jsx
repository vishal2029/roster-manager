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
    });
    return () => unsubAuth();
  }, []);

  // Load tasks from Firestore (only when logged in)
  useEffect(() => {
    if (!user) return;

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
      const dbTasks = [];
      snapshot.forEach((doc) => {
        dbTasks.push(doc.data());
      });
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
      linkedAccount: 'Account A',
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
      <header>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <h1>
            <CalendarIcon size={24} color="var(--primary-color)" />
            Academic Task Management
          </h1>
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontVariantNumeric: 'tabular-nums', fontWeight: '500'}}>
            <span style={{color: 'var(--text-primary)', fontSize: '0.9rem'}}>{currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span style={{color: 'var(--text-secondary)', fontSize: '0.85rem'}}>{currentTime.toLocaleTimeString()}</span>
          </div>
          <div style={{background: 'var(--panel-hover)', borderRadius: '8px', padding: '4px', display: 'flex'}}>
            <button style={{padding: '0.35rem 0.75rem', fontSize: '0.85rem', border: 'none', borderRadius: '6px', cursor: 'pointer', background: viewMode === 'calendar' ? 'var(--primary-color)' : 'transparent', color: viewMode === 'calendar' ? '#fff' : 'var(--text-secondary)'}} onClick={() => setViewMode('calendar')}>Calendar</button>
            <button style={{padding: '0.35rem 0.75rem', fontSize: '0.85rem', border: 'none', borderRadius: '6px', cursor: 'pointer', background: viewMode === 'billing' ? 'var(--primary-color)' : 'transparent', color: viewMode === 'billing' ? '#fff' : 'var(--text-secondary)'}} onClick={() => setViewMode('billing')}>Billing Grid</button>
          </div>
          <button className="btn btn-secondary" onClick={() => setIsDarkMode(!isDarkMode)} aria-label="Toggle Theme" style={{padding: '0.5rem'}}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="btn btn-primary" onClick={handleCreateTask} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem'}}>
            <Plus size={18} /> Add Task
          </button>
          <button className="btn btn-secondary" onClick={() => signOut(auth)} title="Sign Out" style={{padding: '0.5rem'}}>
            <LogOut size={18} />
          </button>
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
