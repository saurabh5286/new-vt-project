import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { Chat } from '../models/Chat';
import { LLMService } from '../services/llm.service';
import { Workspace } from '../models/Workspace';

export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('[Chat] Received request body:', req.body);
    const { workspaceId, question, chatId } = req.body;
    const userId = req.user!.id;

    if (!question) return res.status(400).json({ error: 'Question is required' });

    // Find workspace — use provided or default
    let wsId = workspaceId;
    if (!wsId) {
      const ws = await Workspace.findOne({ ownerId: userId });
      if (!ws) return res.status(400).json({ error: 'No workspace found. Please upload a document first.' });
      wsId = ws._id.toString();
    }

    // Find or create chat session
    let chat;
    if (chatId) {
      chat = await Chat.findById(chatId);
    }
    if (!chat) {
      chat = await Chat.create({
        workspaceId: wsId,
        userId,
        title: question.substring(0, 50) + (question.length > 50 ? '...' : ''),
        messages: [],
      });
    }

    // Save user message
    chat.messages.push({ role: 'user', content: question, timestamp: new Date() });
    await chat.save();

    // Generate AI answer from workspace documents with timeout
    // Wrap the whole answer generation in a top‑level try/catch so any unexpected error is logged
    const generateWithTimeout = async () => {
      try {
        return await Promise.race([
          LLMService.generateAnswer(wsId, question),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('LLM generation timeout')), 15000)),
        ]);
      } catch (outerErr) {
        console.error('[Chat] Unexpected error during answer generation:', outerErr);
        // Propagate a generic error to the client
        throw new Error('Failed to generate answer');
      }
    };

    let answerResult;
    try {
      answerResult = await generateWithTimeout();
    } catch (err: any) {
      console.error('[Chat] generateWithTimeout threw:', err);
      return res.status(500).json({ error: err.message || 'Chat generation failed' });
    }
    const { answer, citations } = answerResult;

    // Save assistant message
    chat.messages.push({
      role: 'assistant',
      content: answer as string,
      // @ts-ignore
      citations: citations.map((c: any) => ({
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
      citations: citations.map((c: any) => ({
        filename: c.filename,
        chunkIndex: c.chunkIndex,
        text: c.text?.substring(0, 300),
      })),
    });
  } catch (error: any) {
    console.error('[Chat] Error:', error.message);
    res.status(500).json({ error: error.message || 'Chat failed' });
  }
};

export const getChatHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chats = await Chat.find({ userId: req.user!.id })
      .sort({ updatedAt: -1 })
      .select('title workspaceId createdAt updatedAt');
    res.json(chats);
  } catch (error) { next(error); }
};

export const getChatMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chat = await Chat.findById(req.params.id).populate({
      path: 'messages.citations.documentId',
      select: 'filename'
    });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json(chat);
  } catch (error) { next(error); }
};

export const getSharedChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chat = await Chat.findById(req.params.id).populate({
      path: 'messages.citations.documentId',
      select: 'filename'
    });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json(chat);
  } catch (error) { next(error); }
};


export const deleteChat = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chatId = req.params.id;
    const userId = req.user!.id;
    console.log('[DeleteChat] Received request for chatId:', chatId, 'userId:', userId);
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) {
      console.log('[DeleteChat] Chat not found or unauthorized');
      return res.status(404).json({ error: 'Chat not found or unauthorized' });
    }
    console.log('[DeleteChat] Deleting chatId:', chatId, 'for userId:', userId);
    await Chat.deleteOne({ _id: chatId });
    console.log('[DeleteChat] Chat deleted successfully');
    return res.json({ message: 'Chat deleted successfully' });
  } catch (error: any) {
    console.error('[Chat] Delete error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to delete chat' });
  }
};







