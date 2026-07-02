import { app } from "./app";
import { connectDB } from "./config/db";
import "./queues/document.queue";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5000;
const mongo_uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/documind';

const startServer = async () => {
  await connectDB(mongo_uri);
};

startServer();

export default app;
