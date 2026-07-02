"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const connectDB = async (MONGO_URI) => {
    try {
        const conn = await mongoose_1.default.connect(MONGO_URI);
        console.log(`MongoDB Connected`);
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(`Error: ${error.message}`);
        }
        else {
            console.error(`Error: ${error}`);
        }
        process.exit(1);
    }
};
exports.connectDB = connectDB;
