require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST", "PUT", "DELETE"] }
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskpilot';

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

const TaskSchema = new mongoose.Schema({
  title: String,
  deadline: Date, 
  priority: String,
  summary: String
});
const Task = mongoose.model('Task', TaskSchema);

// --- HELPER: AI LOGIC ---
// We move this to a function so we can use it for both ADD and EDIT
const calculateAiPriority = (title, deadline) => {
  let aiPriority = 'Low';
  let aiSummary = 'Routine task.';
  
  const taskDeadline = deadline ? new Date(deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const hoursLeft = (taskDeadline - now) / (1000 * 60 * 60); 

  if (hoursLeft < 24 && hoursLeft > 0) {
    aiPriority = 'High';
    aiSummary = '⚠️ AI Alert: Due in less than 24 hours.';
  } else if (hoursLeft < 72 && hoursLeft > 0) {
    aiPriority = 'Medium';
    aiSummary = 'AI Note: Approaching deadline.';
  } else if (title && title.toLowerCase().includes('urgent')) {
    aiPriority = 'High';
    aiSummary = 'Urgent keyword detected.';
  }
  return { aiPriority, aiSummary, taskDeadline };
};

// --- ROUTES ---

app.get('/tasks', async (req, res) => {
  const tasks = await Task.find().sort({ _id: -1 });
  res.json(tasks);
});

app.post('/tasks', async (req, res) => {
  const { title, deadline } = req.body;
  const { aiPriority, aiSummary, taskDeadline } = calculateAiPriority(title, deadline);

  const newTask = new Task({ title, deadline: taskDeadline, priority: aiPriority, summary: aiSummary });
  await newTask.save();

  io.emit('task-added', newTask);
  res.json(newTask);
});

// NEW: PUT Route (Update Task)
app.put('/tasks/:id', async (req, res) => {
  const { title, deadline } = req.body;
  const { aiPriority, aiSummary, taskDeadline } = calculateAiPriority(title, deadline);

  const updatedTask = await Task.findByIdAndUpdate(req.params.id, {
    title,
    deadline: taskDeadline,
    priority: aiPriority,
    summary: aiSummary
  }, { new: true });

  io.emit('task-updated', updatedTask); // Notify clients
  res.json(updatedTask);
});

app.delete('/tasks/:id', async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  io.emit('task-deleted', req.params.id);
  res.json({ success: true });
});

server.listen(5000, () => console.log("🚀 Server running on port 5000"));