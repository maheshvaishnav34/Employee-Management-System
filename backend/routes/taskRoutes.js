const express = require('express');
const router = express.Router();
const { getTasks, createTask, updateTask, deleteTask } = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getTasks);
router.post('/', authorize('admin', 'hr', 'manager'), createTask);
router.put('/:id', updateTask);
router.delete('/:id', authorize('admin', 'hr', 'manager'), deleteTask);

module.exports = router;
