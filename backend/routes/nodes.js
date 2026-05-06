const express = require('express');
const router = express.Router();
const Node = require('../models/Node');
const auth = require('../middleware/auth');

// Calculate weighted progress from milestones
const calcProgress = (milestones) => {
  if (!milestones || milestones.length === 0) return 0;
  let totalWeight = 0;
  let doneWeight = 0;
  const weights = { easy: 1, medium: 2, hard: 3 };
  milestones.forEach(m => {
    (m.tasks || []).forEach(t => {
      const w = weights[t.difficulty] || 2;
      totalWeight += w;
      if (t.done) doneWeight += w;
    });
  });
  if (totalWeight === 0) return 0;
  return Math.round((doneWeight / totalWeight) * 100);
};

const calcGlow = (lastVisited, progress) => {
  const days = (Date.now() - new Date(lastVisited)) / (1000 * 60 * 60 * 24);
  const visitDecay = Math.max(0, 1 - days * 0.12);
  const progressBoost = (progress || 0) / 100;
  return Math.round(Math.min(100, Math.max(10,
    (visitDecay * 0.6 + progressBoost * 0.4) * 100
  )));
};

// Get all nodes
router.get('/', auth, async (req, res) => {
  try {
    const nodes = await Node.find({ userId: req.user.id });
    res.json(nodes);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// Create node
router.post('/', auth, async (req, res) => {
  try {
    const node = new Node({ userId: req.user.id, ...req.body });
    await node.save();
    res.status(201).json(node);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// Update node
router.put('/:id', auth, async (req, res) => {
  try {
    const body = { ...req.body };
    body.progress = calcProgress(body.milestones);
    body.glowLevel = calcGlow(body.lastVisited || new Date(), body.progress);
    body.lastVisited = Date.now();
    const node = await Node.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      body, { new: true }
    );
    if (!node) return res.status(404).json({ message: 'Node not found' });
    res.json(node);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// Delete node
router.delete('/:id', auth, async (req, res) => {
  try {
    await Node.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: 'Node deleted' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// Mark visited + log time
router.patch('/:id/visit', auth, async (req, res) => {
  try {
    const { timeSpentMinutes } = req.body;
    const update = { lastVisited: Date.now() };
    if (timeSpentMinutes) update.$inc = { timeSpent: timeSpentMinutes };
    const node = await Node.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      update, { new: true }
    );
    res.json(node);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;