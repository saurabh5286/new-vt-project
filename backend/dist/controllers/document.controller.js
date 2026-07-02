"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDocumentStatus = exports.clearDocuments = exports.listDocuments = exports.uploadDocument = exports.upload = void 0;
const Document_1 = require("../models/Document");
const Workspace_1 = require("../models/Workspace");
const documentProcessor_service_1 = require("../services/documentProcessor.service");
const llm_service_1 = require("../services/llm.service");
const textExtractor_service_1 = require("../services/textExtractor.service");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// Multer config — store files locally in /uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, path_1.default.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
exports.upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.docx', '.txt', '.md', '.csv', '.pptx'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error(`File type ${ext} not supported`));
        }
    }
});
const uploadDocument = async (req, res, next) => {
    try {
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: 'No file uploaded' });
        const { workspaceId } = req.body;
        const userId = req.user.id;
        // Auto-create a default workspace if none provided
        let wsId = workspaceId;
        if (!wsId) {
            let ws = await Workspace_1.Workspace.findOne({ ownerId: userId });
            if (!ws) {
                ws = await Workspace_1.Workspace.create({ name: 'Default Workspace', ownerId: userId, members: [] });
            }
            wsId = ws._id.toString();
        }
        // Save document record
        const doc = await Document_1.DocumentModel.create({
            workspaceId: wsId,
            uploadedBy: userId,
            filename: file.originalname,
            originalUrl: file.path,
            mimeType: file.mimetype,
            sizeInBytes: file.size,
            status: 'Queued'
        });
        try {
            const extractedText = await textExtractor_service_1.TextExtractor.extract(file.path, file.mimetype);
            if (extractedText && extractedText.trim()) {
                llm_service_1.LLMService.storeWorkspaceContext(wsId, extractedText, { documentId: doc._id, filename: file.originalname, source: 'upload' });
            }
        }
        catch (err) {
            console.warn('[Upload] Immediate context extraction failed, will continue with background processing:', err);
        }
        res.status(201).json({
            message: 'File uploaded. Processing started.',
            document: { id: doc._id, filename: doc.filename, status: doc.status },
            workspaceId: wsId,
        });
        // Process in background (non-blocking)
        documentProcessor_service_1.DocumentProcessor.process(doc._id.toString(), file.path, file.mimetype, wsId, file.originalname)
            .catch(err => console.error('[Upload] Background processing failed:', err));
    }
    catch (error) {
        next(error);
    }
};
exports.uploadDocument = uploadDocument;
const listDocuments = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { workspaceId } = req.query;
        const filter = { uploadedBy: userId };
        if (workspaceId)
            filter.workspaceId = workspaceId;
        const docs = await Document_1.DocumentModel.find(filter)
            .sort({ createdAt: -1 })
            .select('filename status sizeInBytes mimeType workspaceId createdAt');
        res.json(docs);
    }
    catch (error) {
        next(error);
    }
};
exports.listDocuments = listDocuments;
const clearDocuments = async (req, res, next) => {
    try {
        const userId = req.user.id;
        await Document_1.DocumentModel.deleteMany({ uploadedBy: userId });
        return res.json({ message: 'All documents cleared successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.clearDocuments = clearDocuments;
const getDocumentStatus = async (req, res, next) => {
    try {
        const doc = await Document_1.DocumentModel.findById(req.params.id).select('filename status');
        if (!doc)
            return res.status(404).json({ error: 'Document not found' });
        res.json(doc);
    }
    catch (error) {
        next(error);
    }
};
exports.getDocumentStatus = getDocumentStatus;
