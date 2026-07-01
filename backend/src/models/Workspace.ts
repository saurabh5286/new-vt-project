import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWorkspace extends Document {
  name: string;
  ownerId: Types.ObjectId;
  members: {
    userId: Types.ObjectId;
    role: 'Admin' | 'Editor' | 'Viewer';
  }[];
  settings: {
    vectorDbProvider: 'Pinecone' | 'Qdrant' | 'Chroma';
  };
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new Schema<IWorkspace>({
  name: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  members: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['Admin', 'Editor', 'Viewer'], default: 'Viewer' }
  }],
  settings: {
    vectorDbProvider: { type: String, enum: ['Pinecone', 'Qdrant', 'Chroma'], default: 'Qdrant' }
  },
}, { timestamps: true });

export const Workspace = mongoose.model<IWorkspace>('Workspace', workspaceSchema);
