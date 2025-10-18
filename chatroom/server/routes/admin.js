const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const users = await User.find({}, 'username role');
  res.json(users);
});

router.put('/make-admin/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  await User.findByIdAndUpdate(req.params.id, { role: 'admin' });
  res.json({ message: 'User promoted to admin' });
});

router.delete('/remove-user/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User removed' });
});

module.exports = router;
