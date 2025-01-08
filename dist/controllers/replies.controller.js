"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllReplyByThreadId = getAllReplyByThreadId;
exports.createReplies = createReplies;
exports.deleteReply = deleteReply;
const client_1 = require("@prisma/client");
const cloudinary_config_1 = __importDefault(require("../config/cloudinary.config"));
const prisma = new client_1.PrismaClient();
async function getAllReplyByThreadId(req, res) {
    const { threadId } = req.params;
    const userId = req.user.id;
    try {
        // Verifikasi apakah thread dengan threadId ada
        const threadExist = await prisma.thread.findUnique({
            where: { id: parseInt(threadId) },
        });
        if (!threadExist) {
            return res.status(404).json({ message: 'Thread not found' });
        }
        // Ambil semua reply berdasarkan threadId
        const replies = await prisma.reply.findMany({
            where: { threadId: parseInt(threadId) },
            orderBy: { createdAt: 'desc' }, // Urutkan berdasarkan waktu pembuatan (opsional)
            include: {
                UserLike: {
                    select: {
                        userId: true,
                    },
                },
                author: {
                    select: {
                        id: true,
                        fullname: true,
                        username: true,
                        profile: {
                            select: {
                                avatarUrl: true, // Opsional, jika ada avatar user
                            },
                        },
                        _count: {
                            select: {
                                likes: true,
                                replies: true,
                            },
                        },
                    },
                },
            },
        });
        // Tambahkan status isLiked dan jumlah likes
        const repliesWithLikeStatus = replies.map((reply) => ({
            ...reply,
            isLiked: reply.UserLike.some((like) => like.userId === userId), // Apakah user telah menyukai reply ini
            likeCount: reply.UserLike.length, // Jumlah total likes
        }));
        res.status(200).json({
            message: 'Get all replies successful',
            replies: repliesWithLikeStatus,
        });
    }
    catch (error) {
        console.error('Error fetching replies:', error);
        res.status(500).json({ message: 'Error fetching replies' });
    }
}
async function createReplies(req, res) {
    const { threadId } = req.params;
    const { comment } = req.body;
    const userId = req.user.id;
    if (!comment || comment.trim() === '') {
        return res.status(400).json({ message: 'Reply cannot be empty' });
    }
    let imagePath = null;
    if (req.file) {
        try {
            const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            const result = await cloudinary_config_1.default.uploader.upload(base64Image, {
                folder: 'replies', // Nama folder di Cloudinary
            });
            imagePath = result.secure_url;
        }
        catch (error) {
            return res
                .status(500)
                .json({ message: 'Error uploading file to Cloudinary', error });
        }
    }
    try {
        const threadExist = await prisma.thread.findUnique({
            where: {
                id: parseInt(threadId),
            },
        });
        if (!threadExist) {
            return res.status(404).json({ message: 'Thread not found' });
        }
        if (threadExist.isDeleted === 1) {
            return res.status(400).json({ message: 'Thread is already deleted' });
        }
        const reply = await prisma.reply.create({
            data: {
                comment,
                threadId: parseInt(threadId),
                authorId: userId,
                image: imagePath, // Simpan URL gambar jika ada
            },
            include: {
                author: {
                    select: {
                        id: true,
                        fullname: true,
                        username: true,
                        profile: {
                            select: {
                                avatarUrl: true, // Menyertakan avatar pengguna
                            },
                        },
                    },
                },
            },
        });
        res.status(201).json({ message: 'Create comment successfully', reply });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating replies' });
    }
}
async function deleteReply(req, res) {
    const { replyId } = req.params;
    const userId = req.user.id;
    try {
        // Check if the reply exists
        const reply = await prisma.reply.findUnique({
            where: {
                id: parseInt(replyId),
            },
            select: {
                id: true,
                authorId: true,
                threadId: true,
                image: true, // Include image URL to delete from Cloudinary
            },
        });
        if (!reply) {
            return res.status(404).json({ message: 'Reply not found' });
        }
        // Check if the current user is the owner of the thread
        const thread = await prisma.thread.findUnique({
            where: {
                id: reply.threadId,
            },
            select: {
                authorId: true,
            },
        });
        if (!thread) {
            return res.status(404).json({ message: 'Thread not found' });
        }
        // Ensure the user is either the owner of the thread or the reply
        if (reply.authorId !== userId && thread.authorId !== userId) {
            return res
                .status(403)
                .json({ message: 'You are not authorized to delete this reply' });
        }
        // Delete the image from Cloudinary if it exists
        if (reply.image) {
            try {
                // Extract public_id from the image URL
                const publicId = reply.image.split('/').pop()?.split('.')[0]; // Assumes format: https://.../folder/filename.extension
                if (publicId) {
                    await cloudinary_config_1.default.uploader.destroy(`replies/${publicId}`);
                }
            }
            catch (cloudinaryError) {
                console.error('Error deleting image from Cloudinary:', cloudinaryError);
                return res.status(500).json({
                    message: 'Failed to delete image from Cloudinary',
                    error: cloudinaryError,
                });
            }
        }
        // Delete the reply from the database
        await prisma.reply.delete({
            where: {
                id: parseInt(replyId),
            },
        });
        res.status(200).json({ message: 'Reply deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting reply:', error);
        res.status(500).json({ message: 'Error deleting reply', error });
    }
}
