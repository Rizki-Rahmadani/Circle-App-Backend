"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProfile = createProfile;
exports.updateProfile = updateProfile;
const client_1 = require("@prisma/client");
const cloudinary_config_1 = __importDefault(require("../config/cloudinary.config"));
const prisma = new client_1.PrismaClient();
async function createProfile(req, res) {
    const { bio } = req.body;
    const userId = req.user.id; // Assumes userId is retrieved from authenticated user
    const existingProfile = await prisma.profile.findUnique({
        where: { userId },
    });
    if (existingProfile) {
        return res.status(400).json({ message: 'Profile already exists' });
    }
    let avatarPath = null;
    if (req.file) {
        try {
            const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            const result = await cloudinary_config_1.default.uploader.upload(base64Image, {
                folder: 'profile', // Nama folder di Cloudinary
            });
            avatarPath = result.secure_url;
        }
        catch (error) {
            return res
                .status(500)
                .json({ message: 'Error uploading file to Cloudinary', error });
        }
    }
    let data = {
        bio,
        avatarUrl: avatarPath,
        userId,
    };
    try {
        const profile = await prisma.profile.create({
            data,
        });
        res.status(201).json(profile);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating profile' });
    }
}
async function updateProfile(req, res) {
    const userId = req.user.id; // Pastikan id user diambil dari JWT atau session
    const { bio, username, fullname } = req.body;
    let avatarPath = null;
    let backgroundPath = null;
    // Handle avatar image upload
    if (req.files && req.files.avatar) {
        const avatarFile = req.files.avatar[0];
        try {
            const base64Image = `data:${avatarFile.mimetype};base64,${avatarFile.buffer.toString('base64')}`;
            const result = await cloudinary_config_1.default.uploader.upload(base64Image, {
                folder: 'profile/avatars',
            });
            avatarPath = result.secure_url;
        }
        catch (error) {
            return res
                .status(500)
                .json({ message: 'Error uploading avatar to Cloudinary', error });
        }
    }
    // Handle background image upload
    if (req.files && req.files.background) {
        const backgroundFile = req.files.background[0];
        try {
            const base64Image = `data:${backgroundFile.mimetype};base64,${backgroundFile.buffer.toString('base64')}`;
            const result = await cloudinary_config_1.default.uploader.upload(base64Image, {
                folder: 'profile/background',
            });
            backgroundPath = result.secure_url;
        }
        catch (error) {
            return res
                .status(500)
                .json({ message: 'Error uploading background to Cloudinary', error });
        }
    }
    try {
        // Check if the user exists
        const userExists = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!userExists) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Update user information
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                username: username || userExists.username,
                fullname: fullname || userExists.fullname,
            },
        });
        // Check if the profile exists
        const existingProfile = await prisma.profile.findUnique({
            where: { userId: userId },
        });
        let updatedProfile;
        if (existingProfile) {
            // Update existing profile
            updatedProfile = await prisma.profile.update({
                where: { userId: userId },
                data: {
                    bio: bio || existingProfile.bio,
                    avatarUrl: avatarPath || existingProfile.avatarUrl,
                    backgroundUrl: backgroundPath || existingProfile.backgroundUrl,
                },
            });
        }
        else {
            // Create a new profile if it doesn't exist
            updatedProfile = await prisma.profile.create({
                data: {
                    bio: bio || '',
                    avatarUrl: avatarPath || null,
                    backgroundUrl: backgroundPath || null,
                    userId: userId,
                },
            });
        }
        // Count followers and following
        const followersCount = await prisma.followUser.count({
            where: { followingId: userId },
        });
        const followingCount = await prisma.followUser.count({
            where: { followerId: userId },
        });
        res.status(200).json({
            message: 'Profile updated successfully',
            data: {
                updatedUser,
                updatedProfile,
                followersCount,
                followingCount,
            },
        });
    }
    catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({ message: 'Error updating profile', error });
    }
}
