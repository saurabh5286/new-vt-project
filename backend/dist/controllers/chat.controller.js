"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteChat = exports.getSharedChat = exports.getChatMessages = exports.getChatHistory = exports.sendMessage = void 0;
const Chat_1 = require("../models/Chat");
const llm_service_1 = require("../services/llm.service");
const Workspace_1 = require("../models/Workspace");
const sendMessage = async (req, res, next) => {
    try {
        console.log('[Chat] Received request body:', req.body);
        const { workspaceId, question, chatId } = req.body;
        const userId = req.user.id;
        if (!question)
            return res.status(400).json({ error: 'Question is required' });
        // Find workspace — use provided or default
        let wsId = workspaceId;
        if (!wsId) {
            const ws = await Workspace_1.Workspace.findOne({ ownerId: userId });
            if (!ws)
                return res.status(400).json({ error: 'No workspace found. Please upload a document first.' });
            wsId = ws._id.toString();
        }
        // Find or create chat session
        let chat;
        if (chatId) {
            chat = await Chat_1.Chat.findById(chatId);
        }
        if (!chat) {
            chat = await Chat_1.Chat.create({
                workspaceId: wsId,
                userId,
                title: question.substring(0, 50) + (question.length > 50 ? '...' : ''),
                messages: [],
            });
        }
        // Save user message
        chat.messages.push({ role: 'user', content: question, timestamp: new Date() });
        await chat.save();
        let answerResult;
        try {
            answerResult = await llm_service_1.LLMService.generateAnswer(wsId, question);
        }
        catch (err) {
            console.error('[Chat] Answer generation threw:', err);
            return res.status(500).json({ error: err.message || 'Chat generation failed' });
        }
        const { answer, citations } = answerResult;
        // Save assistant message
        chat.messages.push({
            role: 'assistant',
            content: answer,
            // @ts-ignore
            citations: citations.map((c) => ({
                documentId: c.documentId,
                pageNumber: c.chunkIndex,
                paragraphText: c.text?.substring(0, 200),
                confidenceScore: c.score || 0,
            })),
            timestamp: new Date()
        });
        await chat.save();
        res.json({
            chatId: chat._id,
            answer,
            citations: citations.map((c) => ({
                filename: c.filename,
                chunkIndex: c.chunkIndex,
                text: c.text?.substring(0, 300),
            })),
        });
    }
    catch (error) {
        console.error('[Chat] Error:', error.message);
        res.status(500).json({ error: error.message || 'Chat failed' });
    }
};
exports.sendMessage = sendMessage;
const getChatHistory = async (req, res, next) => {
    try {
        const chats = await Chat_1.Chat.find({ userId: req.user.id })
            .sort({ updatedAt: -1 })
            .select('title workspaceId createdAt updatedAt');
        res.json(chats);
    }
    catch (error) {
        next(error);
    }
};
exports.getChatHistory = getChatHistory;
const getChatMessages = async (req, res, next) => {
    try {
        const chat = await Chat_1.Chat.findById(req.params.id).populate({
            path: 'messages.citations.documentId',
            select: 'filename'
        });
        if (!chat)
            return res.status(404).json({ error: 'Chat not found' });
        res.json(chat);
    }
    catch (error) {
        next(error);
    }
};
exports.getChatMessages = getChatMessages;
const getSharedChat = async (req, res, next) => {
    try {
        const chat = await Chat_1.Chat.findById(req.params.id).populate({
            path: 'messages.citations.documentId',
            select: 'filename'
        });
        if (!chat)
            return res.status(404).json({ error: 'Chat not found' });
        res.json(chat);
    }
    catch (error) {
        next(error);
    }
};
exports.getSharedChat = getSharedChat;
const deleteChat = async (req, res, next) => {
    try {
        const chatId = req.params.id;
        const userId = req.user.id;
        console.log('[DeleteChat] Received request for chatId:', chatId, 'userId:', userId);
        const chat = await Chat_1.Chat.findOne({ _id: chatId, userId });
        if (!chat) {
            console.log('[DeleteChat] Chat not found or unauthorized');
            return res.status(404).json({ error: 'Chat not found or unauthorized' });
        }
        console.log('[DeleteChat] Deleting chatId:', chatId, 'for userId:', userId);
        await Chat_1.Chat.deleteOne({ _id: chatId });
        console.log('[DeleteChat] Chat deleted successfully');
        return res.json({ message: 'Chat deleted successfully' });
    }
    catch (error) {
        console.error('[Chat] Delete error:', error.message);
        return res.status(500).json({ error: error.message || 'Failed to delete chat' });
    }
};
exports.deleteChat = deleteChat;
