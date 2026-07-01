import { Router } from 'express';
import { uploadDocument, listDocuments, getDocumentStatus, upload } from '../controllers/document.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', listDocuments);
router.get('/:id/status', getDocumentStatus);

export default router;
