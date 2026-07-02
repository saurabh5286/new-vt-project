"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const db_1 = require("./config/db");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PORT = process.env.PORT || 5000;
const mongo_uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/documind';
const startServer = async () => {
    await (0, db_1.connectDB)(mongo_uri);
};
if (process.env.NODE_ENV !== 'production') {
    startServer();
}
exports.default = app_1.app;
