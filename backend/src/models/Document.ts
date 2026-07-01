import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDocument extends Document {
  workspaceId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  filename: string;
  originalUrl: string;
  thumbnailUrl?: string;
  sizeInBytes: number;
  mimeType: string;
  status: 'Uploading' | 'Queued' | 'Processing' | 'GeneratingEmbeddings' | 'Completed' | 'Failed' | 'Reprocessing' | 'Deleted';
  metadata: {
    pageCount?: number;
    author?: string;
    language?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  filename: { type: String, required: true },
  originalUrl: { type: String, required: true },
  thumbnailUrl: { type: String },
  sizeInBytes: { type: Number, required: true },
  mimeType: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Uploading', 'Queued', 'Processing', 'GeneratingEmbeddings', 'Completed', 'Failed', 'Reprocessing', 'Deleted'],
    default: 'Uploading'
  },
  metadata: {
    pageCount: Number,
    author: String,
    language: String
  },
}, { timestamps: true });

export const DocumentModel = mongoose.model<IDocument>('Document', documentSchema);
