import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { DocumentModel } from '../models/Document';
import { Workspace } from '../models/Workspace';
import { DocumentProcessor } from '../services/documentProcessor.service';
import multer from 'multer';
import path from 'path';

// Multer config — store files locally in /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

export const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.txt', '.md', '.csv', '.pptx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not supported`));
    }
  }
});

export const uploadDocument = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const { workspaceId } = req.body;
    const userId = req.user!.id;

    // Auto-create a default workspace if none provided
    let wsId = workspaceId;
    if (!wsId) {
      let ws = await Workspace.findOne({ ownerId: userId });
      if (!ws) {
        ws = await Workspace.create({ name: 'Default Workspace', ownerId: userId, members: [] });
      }
      wsId = ws._id.toString();
    }

    // Save document record
    const doc = await DocumentModel.create({
      workspaceId: wsId,
      uploadedBy: userId,
      filename: file.originalname,
      originalUrl: file.path,
      mimeType: file.mimetype,
      sizeInBytes: file.size,
      status: 'Queued'
    });

    res.status(201).json({
      message: 'File uploaded. Processing started.',
      document: { id: doc._id, filename: doc.filename, status: doc.status },
      workspaceId: wsId,
    });

    // Process in background (non-blocking)
    DocumentProcessor.process(doc._id.toString(), file.path, file.mimetype, wsId, file.originalname)
      .catch(err => console.error('[Upload] Background processing failed:', err));

  } catch (error) {
    next(error);
  }
};

export const listDocuments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { workspaceId } = req.query;

    const filter: any = { uploadedBy: userId };
    if (workspaceId) filter.workspaceId = workspaceId;

    const docs = await DocumentModel.find(filter)
      .sort({ createdAt: -1 })
      .select('filename status sizeInBytes mimeType workspaceId createdAt');

    res.json(docs);
  } catch (error) {
    next(error);
  }
};

export const clearDocuments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    await DocumentModel.deleteMany({ uploadedBy: userId });
    return res.json({ message: 'All documents cleared successfully' });
  } catch (error) {
    next(error);
  }
};

export const getDocumentStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const doc = await DocumentModel.findById(req.params.id).select('filename status');
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (error) {
    next(error);
  }
};
