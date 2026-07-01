import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { Workspace } from '../models/Workspace';

const router = Router();

router.use(requireAuth);

// List all workspaces for the logged in user
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaces = await Workspace.find({
      $or: [
        { ownerId: req.user!.id },
        { 'members.userId': req.user!.id }
      ]
    }).sort({ createdAt: -1 });
    res.json(workspaces);
  } catch (err) { next(err); }
});

// Create a new workspace
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    const workspace = await Workspace.create({ name, ownerId: req.user!.id, members: [] });
    res.status(201).json(workspace);
  } catch (err) { next(err); }
});

// Get a single workspace
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ws = await Workspace.findById(req.params.id);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });
    res.json(ws);
  } catch (err) { next(err); }
});
// Delete a workspace
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ws = await Workspace.findOneAndDelete({ _id: req.params.id, ownerId: req.user!.id });
    if (!ws) return res.status(404).json({ error: 'Workspace not found or unauthorized' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
