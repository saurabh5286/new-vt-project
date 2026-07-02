"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const document_routes_1 = __importDefault(require("./routes/document.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const workspace_routes_1 = __importDefault(require("./routes/workspace.routes"));
const errorHandler_1 = require("./middlewares/errorHandler");
const app = (0, express_1.default)();
exports.app = app;
const allowedOrigins = [
    process.env.CLIENT_URL,
    'https://new-vt-project-2.vercel.app',
    'https://new-vt-project-2.vercel.app/',
].filter(Boolean);
// Global Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`Origin not allowed: ${origin}`));
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Healthcheck
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});
// API Routes
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/documents', document_routes_1.default);
app.use('/api/v1/chat', chat_routes_1.default);
app.use('/api/v1/workspaces', workspace_routes_1.default);
// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
// Error Handler
app.use(errorHandler_1.errorHandler);
