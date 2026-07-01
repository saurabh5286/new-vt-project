import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  citations?: {
    documentId: Types.ObjectId;
    pageNumber?: number;
    paragraphText?: string;
    confidenceScore?: number;
  }[];
  timestamp: Date;
}

export interface IChat extends Document {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  documentIds: Types.ObjectId[];
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
  content: { type: String, required: true },
  citations: [{
    documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
    pageNumber: Number,
    paragraphText: String,
    confidenceScore: Number
  }],
  timestamp: { type: Date, default: Date.now }
});

const chatSchema = new Schema<IChat>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  documentIds: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
  messages: [messageSchema]
}, { timestamps: true });

export const Chat = mongoose.model<IChat>('Chat', chatSchema);
