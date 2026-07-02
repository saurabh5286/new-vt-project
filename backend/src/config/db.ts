import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async (MONGO_URI: string) => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`MongoDB Connected`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`MongoDB connection failed: ${error.message}`);
    } else {
      console.error(`MongoDB connection failed: ${error}`);
    }
  }
};
