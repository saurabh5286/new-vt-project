import { app } from "./app";
import { connectDB } from "./config/db";
import "./queues/document.queue";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/documind";

const startServer = async () => {
  await connectDB(MONGO_URI);
  
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer();
