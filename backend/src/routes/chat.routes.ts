import { Router } from 'express';
import { sendMessage, getChatHistory, getChatMessages, getSharedChat, deleteChat } from '../controllers/chat.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use((req, res, next) => {
  console.log('[Chat Router Debug] Incoming request:', req.method, req.originalUrl);
  next();
});

router.get('/share/:id', getSharedChat);

router.use(requireAuth);
router.post('/message', sendMessage);
router.get('/history', getChatHistory);
router.delete('/:id', deleteChat);
router.get('/:id', getChatMessages);



export default router;
