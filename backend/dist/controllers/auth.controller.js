"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const User_1 = require("../models/User");
const auth_service_1 = require("../services/auth.service");
const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const existing = await User_1.User.findOne({ email });
        if (existing)
            return res.status(400).json({ error: 'Email already in use' });
        const passwordHash = await auth_service_1.AuthService.hashPassword(password);
        const user = await User_1.User.create({ name, email, passwordHash });
        const token = auth_service_1.AuthService.generateAccessToken(user.id, user.role);
        res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, token });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.User.findOne({ email });
        if (!user)
            return res.status(400).json({ error: 'Invalid credentials' });
        const isMatch = await auth_service_1.AuthService.comparePassword(password, user.passwordHash);
        if (!isMatch)
            return res.status(400).json({ error: 'Invalid credentials' });
        const token = auth_service_1.AuthService.generateAccessToken(user.id, user.role);
        const refreshToken = auth_service_1.AuthService.generateRefreshToken(user.id);
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        res.status(200).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
