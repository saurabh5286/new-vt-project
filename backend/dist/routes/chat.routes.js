"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.use((req, res, next) => {
    console.log('[Chat Router Debug] Incoming request:', req.method, req.originalUrl);
    next();
});
router.get('/share/:id', chat_controller_1.getSharedChat);
router.use(auth_1.requireAuth);
router.post('/message', chat_controller_1.sendMessage);
router.get('/history', chat_controller_1.getChatHistory);
router.delete('/:id', chat_controller_1.deleteChat);
router.get('/:id', chat_controller_1.getChatMessages);
exports.default = router;
