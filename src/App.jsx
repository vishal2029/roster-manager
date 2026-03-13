import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from './firebase';
import Calendar from './components/Calendar';
import GanttChart from './components/GanttChart';
import TaskModal from './components/TaskModal';
import BillingSheet from './components/BillingSheet';
import Login from './components/Login';
import { Plus, Calendar as CalIcon, List, BarChart3, Receipt, LogOut, Sun, Moon, Bell } from 'lucide-react';
import { format } from 'date-fns';

function App() {
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState('calendar');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewingTask, setViewingTask] = useState(null);
  const [ganttTask, setGanttTask] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

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

  // Use refs to store state values for the notification timer to avoid dependency loops
  const tasksRef = useRef([]);
  const notifiedTasks = useRef(new Set());
  const seenTaskIds = useRef(new Set());
  const isInitialLoad = useRef(true);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Task Loading (One-time subscription per user)
  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
      const dbTasks = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        dbTasks.push(data);

        // Notify if it's a new task (not seen before, and not the very first load)
        if (!isInitialLoad.current && !seenTaskIds.current.has(data.id)) {
          new Notification("🆕 New Task Added", {
            body: `${data.title} (${data.type})`,
            icon: '/v_fav.png'
          });
        }
        seenTaskIds.current.add(data.id);
      });
      
      isInitialLoad.current = false;
      setTasks(dbTasks);
    }, (error) => {
      console.error("Firebase connection error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Periodic Notification Polling & Current Time Update
  useEffect(() => {
    if (!user) return;

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      tasksRef.current.forEach(task => {
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

        // General Overdue
        if (diffMins < 0 && !notifiedTasks.current.has(`${task.id}-overdue`)) {
          new Notification("🚨 Task Overdue!", {
            body: `"${task.title}" has passed its deadline!`,
            icon: '/v_fav.png'
          });
          notifiedTasks.current.add(`${task.id}-overdue`);
        }
      });
    }, 60000);

    return () => clearInterval(timer);
  }, [user]);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Sync viewingTask and ganttTask if tasks list changes
  useEffect(() => {
    if (viewingTask) {
      const updated = tasks.find(t => t.id === viewingTask.id);
      if (updated) setViewingTask(updated);
    }
    if (ganttTask) {
      const updated = tasks.find(t => t.id === ganttTask.id);
      if (updated) setGanttTask(updated);
    }
  }, [tasks]);

  const addTask = async (taskData) => {
    const taskId = Math.random().toString(36).substr(2, 9);
    const newTask = {
      ...taskData,
      id: taskId,
      createdAt: new Date().toISOString()
    };
    
    try {
      await setDoc(doc(db, "tasks", taskId), newTask);
      setIsModalOpen(false);
    } catch (e) {
      console.error("Error adding task: ", e);
    }
  };

  const updateTask = async (taskData) => {
    try {
      await setDoc(doc(db, "tasks", taskData.id), taskData);
      setEditingTask(null);
    } catch (e) {
      console.error("Error updating task: ", e);
    }
  };

  const deleteTask = async (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteDoc(doc(db, "tasks", taskId));
        setViewingTask(null);
      } catch (e) {
        console.error("Error deleting task: ", e);
      }
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  if (!user) {
    return <Login onLogin={() => {}} />;
  }

  return (
    <div className="app">
      <header>
        <h1>
          <CalIcon size={24} /> Task Roster
        </h1>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <div className="view-switcher" style={{display: 'flex', background: 'var(--panel-bg)', borderRadius: '8px', padding: '4px', border: '1px solid var(--border-color)'}}>
            <button className={`btn icon-btn ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')} title="Calendar" style={{padding: '6px 12px', background: view === 'calendar' ? 'var(--panel-hover)' : 'transparent', color: view === 'calendar' ? 'var(--primary-color)' : 'var(--text-secondary)'}}>
              <CalIcon size={20} />
            </button>

            <button className={`btn icon-btn ${view === 'gantt' ? 'active' : ''}`} onClick={() => setView('gantt')} title="Gantt Chart" style={{padding: '6px 12px', background: view === 'gantt' ? 'var(--panel-hover)' : 'transparent', color: view === 'gantt' ? 'var(--primary-color)' : 'var(--text-secondary)'}}>
              <BarChart3 size={20} />
            </button>
            <button className={`btn icon-btn ${view === 'billing' ? 'active' : ''}`} onClick={() => setView('billing')} title="Billing Grid" style={{padding: '6px 12px', background: view === 'billing' ? 'var(--panel-hover)' : 'transparent', color: view === 'billing' ? 'var(--primary-color)' : 'var(--text-secondary)'}}>
              <Receipt size={20} />
            </button>
          </div>

          <button className="btn icon-btn" onClick={toggleTheme} title={isDarkMode ? "Light Mode" : "Dark Mode"} style={{padding: '6px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-primary)'}}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
            <Plus size={18} /> Add Task
          </button>

          <button className="btn btn-secondary" onClick={handleSignOut} style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </header>

      <main className="dashboard-container">
        {view === 'calendar' && (
          <Calendar 
            tasks={tasks} 
            onTaskClick={(task) => setViewingTask(task)}
            currentTime={currentTime}
          />
        )}

        {view === 'gantt' && (
          <GanttChart 
            tasks={tasks} 
            onTaskClick={(task) => setViewingTask(task)}
          />
        )}
        {view === 'billing' && (
          <BillingSheet tasks={tasks} />
        )}
      </main>

      {(isModalOpen || editingTask || viewingTask) && (
        <TaskModal 
          isOpen={true}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTask(null);
            setViewingTask(null);
          }}
          onSave={editingTask ? updateTask : addTask}
          onDelete={deleteTask}
          onGanttOpen={(task) => {
            setViewingTask(null);
            setGanttTask(task);
            setView('gantt');
          }}
          editTask={editingTask || viewingTask}
          isViewOnly={!!viewingTask && !editingTask}
          onEdit={() => {
            setEditingTask(viewingTask);
            setViewingTask(null);
          }}
          currentTime={currentTime}
        />
      )}
    </div>
  );
}

export default App;
