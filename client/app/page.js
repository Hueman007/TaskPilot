"use client";
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

let socket;

// --- SUB-COMPONENT: Countdown Timer & Notifications ---
function Countdown({ targetDate, title }) {
  const [timeLeft, setTimeLeft] = useState('');
  
  // Refs to track if we already sent the notification (prevents spamming every second)
  const hasNotified10Min = useRef(false);
  const hasNotifiedOverdue = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const target = new Date(targetDate);
      const diff = target - now;

      // --- NOTIFICATION LOGIC ---
      if (Notification.permission === "granted") {
        
        // 1. Time Up Notification
        if (diff <= 0 && !hasNotifiedOverdue.current) {
          new Notification("Task Overdue! 🚨", {
            body: `Time is up for: "${title}"`,
            icon: "/next.svg" // Optional icon
          });
          hasNotifiedOverdue.current = true;
        }

        // 2. 10 Minute Warning (600,000 ms)
        // We check if it is between 0 and 10 mins, and haven't notified yet.
        if (diff > 0 && diff <= 600000 && !hasNotified10Min.current) {
          new Notification("10 Minutes Left! ⏳", {
            body: `Hurry up! "${title}" is due soon.`,
          });
          hasNotified10Min.current = true;
        }
      }
      // ---------------------------

      if (diff <= 0) {
        setTimeLeft('Overdue');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      let timeString = '';
      if (days > 0) timeString += `${days}d `;
      timeString += `${hours}h ${minutes}m ${seconds}s`;
      
      setTimeLeft(timeString);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, title]);

  return <span className={`font-mono ${timeLeft === 'Overdue' ? 'text-red-500 font-bold' : 'text-blue-300'}`}>{timeLeft}</span>;
}

// --- MAIN COMPONENT ---
export default function Home() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    // 1. REQUEST NOTIFICATION PERMISSION ON LOAD
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    socket = io('http://localhost:5000');

    axios.get('http://localhost:5000/tasks')
      .then(res => setTasks(res.data))
      .catch(err => console.error(err));

    socket.on('task-added', (task) => setTasks((prev) => [task, ...prev]));
    socket.on('task-deleted', (id) => setTasks((prev) => prev.filter(t => t._id !== id)));
    socket.on('task-updated', (updatedTask) => {
      setTasks((prev) => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
    });

    return () => socket.disconnect();
  }, []);

  const handleSubmit = async () => {
    if (!title) return;
    setLoading(true);

    try {
      if (editingId) {
        await axios.put(`http://localhost:5000/tasks/${editingId}`, { title, deadline });
        setEditingId(null); 
      } else {
        await axios.post('http://localhost:5000/tasks', { title, deadline });
      }
      setTitle('');
      setDeadline('');
    } catch (error) {
      console.error("Error saving task", error);
    }
    setLoading(false);
  };

  const handleEditClick = (task) => {
    setEditingId(task._id);
    setTitle(task.title);
    if (task.deadline) {
      const d = new Date(task.deadline);
      const offset = d.getTimezoneOffset() * 60000;
      const localISOTime = new Date(d - offset).toISOString().slice(0, 16);
      setDeadline(localISOTime);
    }
  };

  const handleDelete = async (id) => {
    await axios.delete(`http://localhost:5000/tasks/${id}`);
    if (editingId === id) { 
      setEditingId(null);
      setTitle('');
      setDeadline('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 border-b border-slate-700 pb-4">
          <h1 className="text-3xl font-bold text-blue-400">TaskPilot <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded ml-2">Beta</span></h1>
          <p className="text-slate-400 text-sm mt-1">AI-Driven Real-Time Collaboration</p>
        </header>

        {/* INPUT SECTION */}
        <div className={`flex gap-2 mb-8 p-3 rounded-lg border transition duration-300 ${editingId ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-800 border-slate-700'}`}>
          <input 
            className="flex-1 p-2 bg-transparent text-white focus:outline-none"
            placeholder={editingId ? "Update task description..." : "Describe new task..."}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          
          <input 
            type="datetime-local"
            className="bg-slate-700 text-white rounded px-2 text-sm border-none focus:outline-none"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />

          <button 
            onClick={handleSubmit}
            disabled={loading}
            className={`px-6 py-2 rounded font-bold transition disabled:opacity-50 ${editingId ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500'}`}
          >
            {loading ? 'Processing...' : (editingId ? 'Update' : 'Add')}
          </button>

          {editingId && (
            <button 
              onClick={() => { setEditingId(null); setTitle(''); setDeadline(''); }}
              className="text-slate-400 hover:text-white px-2"
            >
              ✕
            </button>
          )}
        </div>

        {/* TASK LIST */}
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task._id} className={`bg-slate-800 p-4 rounded-lg border flex justify-between items-center group transition ${editingId === task._id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-700 hover:border-blue-500/50'}`}>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-lg">{task.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded font-bold ${
                    task.priority === 'High' ? 'bg-red-900 text-red-200' : 
                    task.priority === 'Medium' ? 'bg-yellow-900 text-yellow-200' : 
                    'bg-green-900 text-green-200'
                  }`}>
                    {task.priority}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                  <span>{task.summary}</span>
                  {task.deadline && (
                    <div className="flex items-center gap-1 bg-slate-700/50 px-2 py-0.5 rounded border border-slate-600">
                      <span>⏳ Time Left:</span>
                      {/* Pass 'title' so the notification knows what task it is */}
                      <Countdown targetDate={task.deadline} title={task.title} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleEditClick(task)}
                  className="text-slate-500 hover:text-blue-400 px-2 text-sm"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(task._id)}
                  className="text-slate-500 hover:text-red-400 px-2 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="text-center text-slate-500 mt-10">No tasks yet. Start typing!</p>
          )}
        </div>
      </div>
    </div>
  );
}