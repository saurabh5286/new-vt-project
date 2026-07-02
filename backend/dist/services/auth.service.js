"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class AuthService {
    static generateAccessToken(userId, role) {
        const secret = process.env.JWT_SECRET?.trim() || 'supersecretkey123';
        return jsonwebtoken_1.default.sign({ id: userId, role }, secret, { expiresIn: '30d' });
    }
    static generateRefreshToken(userId) {
        const refreshSecret = process.env.JWT_REFRESH_SECRET?.trim() || 'supersecretrefresh456';
        return jsonwebtoken_1.default.sign({ id: userId }, refreshSecret, { expiresIn: '7d' });
    }
    static async hashPassword(password) {
        const salt = await bcryptjs_1.default.genSalt(10);
        return bcryptjs_1.default.hash(password, salt);
    }
    static async comparePassword(password, hash) {
        return bcryptjs_1.default.compare(password, hash);
    }
}
exports.AuthService = AuthService;
