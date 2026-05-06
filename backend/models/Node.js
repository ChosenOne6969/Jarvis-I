const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  text: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  done: { type: Boolean, default: false },
  deadline: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  order: { type: Number, default: 0 },
  tasks: [taskSchema],
  createdAt: { type: Date, default: Date.now },
});

const nodeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'UNNAMED' },
  goal: { type: String, default: '' },
  milestones: [milestoneSchema],
  progress: { type: Number, default: 0, min: 0, max: 100 },
  glowLevel: { type: Number, default: 100, min: 0, max: 100 },
  timeSpent: { type: Number, default: 0 }, // minutes
  lastVisited: { type: Date, default: Date.now },
  position: {
    x: { type: Number, default: () => Math.random() * 800 },
    y: { type: Number, default: () => Math.random() * 600 },
  },
  resources: [String],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Node', nodeSchema);