"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SECRET_KEY = process.env.SECRET_KEY || 'asdawdasdasdsdawdadsdfd';
const prisma = new client_1.PrismaClient();
const SALT_ROUNDS = 10;
async function register(req, res) {
    const { username, fullname, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    try {
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ username }, { email }],
            },
        });
        if (existingUser) {
            return res
                .status(400)
                .json({ message: 'Username or email already exists' });
        }
        // Hash password
        const hashedPassword = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        const newUser = await prisma.user.create({
            data: {
                username,
                fullname,
                email,
                password: hashedPassword,
            },
        });
        res.status(201).json({ message: 'User registered', user: newUser });
    }
    catch (error) {
        res.status(500).json({ message: 'Error registering user', error });
    }
}
async function login(req, res) {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    try {
        // Fetch user first
        const user = await prisma.user.findUnique({
            where: { username },
            include: {
                profile: {
                    select: {
                        bio: true,
                        avatarUrl: true,
                    },
                },
            },
        });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        // Compare password
        const isMatch = await bcrypt_1.default.compare(password, user.password);
        if (isMatch) {
            const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
            res.status(200).json({
                message: 'Login successful',
                user: {
                    username: user.username,
                    email: user.email,
                    fullname: user.fullname,
                    profile: user.profile,
                },
                token,
            });
        }
        else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Error logging in', error });
    }
}
