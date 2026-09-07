import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json([{ title: 'Plan A working 🚀' }]);
});

export default router;
