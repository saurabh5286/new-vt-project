"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const Workspace_1 = require("../models/Workspace");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// List all workspaces for the logged in user
router.get('/', async (req, res, next) => {
    try {
        const workspaces = await Workspace_1.Workspace.find({
            $or: [
                { ownerId: req.user.id },
                { 'members.userId': req.user.id }
            ]
        }).sort({ createdAt: -1 });
        res.json(workspaces);
    }
    catch (err) {
        next(err);
    }
});
// Create a new workspace
router.post('/', async (req, res, next) => {
    try {
        const { name } = req.body;
        const workspace = await Workspace_1.Workspace.create({ name, ownerId: req.user.id, members: [] });
        res.status(201).json(workspace);
    }
    catch (err) {
        next(err);
    }
});
// Get a single workspace
router.get('/:id', async (req, res, next) => {
    try {
        const ws = await Workspace_1.Workspace.findById(req.params.id);
        if (!ws)
            return res.status(404).json({ error: 'Workspace not found' });
        res.json(ws);
    }
    catch (err) {
        next(err);
    }
});
// Delete a workspace
router.delete('/:id', async (req, res, next) => {
    try {
        const ws = await Workspace_1.Workspace.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
        if (!ws)
            return res.status(404).json({ error: 'Workspace not found or unauthorized' });
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
