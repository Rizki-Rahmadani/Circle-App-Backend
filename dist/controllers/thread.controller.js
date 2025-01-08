"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createThread = createThread;
exports.getThreadById = getThreadById;
exports.getThreadByUser = getThreadByUser;
exports.getAllThreads = getAllThreads;
exports.deleteThread = deleteThread;
exports.getAllThreadByAuthorId = getAllThreadByAuthorId;
exports.updateThread = updateThread;
const client_1 = require("@prisma/client");
const cloudinary_config_1 = __importDefault(require("../config/cloudinary.config"));
const prisma = new client_1.PrismaClient();
async function createThread(req, res) {
    const { content } = req.body;
    const user = req.user;
    if (!content) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    // Periksa apakah pengguna sudah login
    if (!user || !user.id) {
        return res.status(401).json({ message: 'User is not authenticated' });
    }
    const authorId = user.id;
    let imagePath = null;
    if (req.file) {
        try {
            const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            const result = await cloudinary_config_1.default.uploader.upload(base64Image, {
                folder: 'threads', // Nama folder di Cloudinary
            });
            imagePath = result.secure_url;
        }
        catch (error) {
            return res
                .status(500)
                .json({ message: 'Error uploading file to Cloudinary', error });
        }
    }
    let data = {
        content,
        authorId: parseInt(authorId),
        image: imagePath,
    };
    try {
        const newThread = await prisma.thread.create({
            data,
        });
        res.status(201).json({ message: 'Thread created', thread: newThread });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating thread', error });
    }
}
async function getThreadById(req, res) {
    const { id } = req.params;
    const userId = req.user.id; // Ambil ID pengguna yang login
    try {
        // Validasi ID
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Thread ID is required',
            });
        }
        // Cari thread berdasarkan ID
        const thread = await prisma.thread.findUnique({
            where: {
                id: parseInt(id),
            },
            include: {
                author: {
                    select: {
                        username: true,
                        fullname: true,
                        profile: {
                            select: {
                                avatarUrl: true,
                            },
                        },
                    },
                },
                likes: {
                    select: {
                        userId: true,
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        replies: true,
                    },
                },
            },
        });
        if (!thread) {
            return res.status(404).json({
                message: 'Thread not found',
            });
        }
        // Tambahkan status like
        const isLiked = thread.likes.some((like) => like.userId === userId);
        return res.status(200).json({
            thread: {
                ...thread,
                isLiked, // Status like
            },
        });
    }
    catch (error) {
        console.error('Error fetching thread by ID:', error);
        return res.status(500).json({
            message: 'Internal server error',
        });
    }
}
async function getThreadByUser(req, res) {
    const userId = req.user.id; // Ambil id dari pengguna yang login
    try {
        const threads = await prisma.thread.findMany({
            where: {
                authorId: userId, // Hanya ambil thread milik pengguna yang login
                isDeleted: 0,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        fullname: true,
                        username: true,
                        profile: {
                            select: {
                                avatarUrl: true,
                                backgroundUrl: true,
                            },
                        },
                    },
                },
                likes: {
                    select: {
                        userId: true,
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        replies: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        // Tambahkan status like untuk setiap thread
        const threadsWithLikeStatus = threads.map((thread) => {
            return {
                ...thread,
                isLiked: thread.likes.some((like) => like.userId === userId),
            };
        });
        res.status(200).json(threadsWithLikeStatus);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching threads', error });
    }
}
async function getAllThreads(req, res) {
    const userId = req.user.id; // Ambil ID pengguna yang login
    try {
        const allThreads = await prisma.thread.findMany({
            where: {
                isDeleted: 0,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        fullname: true,
                        username: true,
                        profile: {
                            select: {
                                avatarUrl: true,
                            },
                        },
                    },
                },
                likes: {
                    select: {
                        userId: true,
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        replies: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc', // Urutkan berdasarkan waktu pembuatan (desc = terbaru di atas)
            },
        });
        // Tambahkan status like untuk setiap thread
        const threadsWithLikeStatus = await Promise.all(allThreads.map(async (thread) => {
            return {
                ...thread,
                isLiked: thread.likes.some((like) => like.userId === userId),
            };
        }));
        res.status(200).json({
            message: 'Get all threads successful',
            threads: threadsWithLikeStatus,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching all threads', error });
    }
}
async function deleteThread(req, res) {
    const threadId = parseInt(req.params.id);
    try {
        const threadExist = await prisma.thread.findUnique({
            where: { id: threadId },
        });
        if (!threadExist) {
            return res.status(404).json({ message: 'Thread not found' });
        }
        if (threadExist.authorId !== req.user.id) {
            return res
                .status(401)
                .json({ message: 'User not granted to delete this thread' });
        }
        if (threadExist.isDeleted === 1) {
            return res.status(400).json({ message: 'Thread is already deleted' });
        }
        if (threadExist.image) {
            const publicId = extractPublicId(threadExist.image);
            if (publicId) {
                // Pindahkan gambar ke folder "threads_deleted"
                await cloudinary_config_1.default.uploader.rename(publicId, `threads_deleted/${publicId.split('/').pop()}`);
            }
        }
        //soft delete
        await prisma.thread.update({
            where: {
                id: threadId,
            },
            data: {
                isDeleted: 1,
            },
        });
        res.status(200).json({ message: 'thread deleted' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting thread', error });
    }
}
// Fungsi untuk mengekstrak public_id dari URL gambar
function extractPublicId(url) {
    try {
        const regex = /\/v\d+\/(.+?)\.[a-z]+$/; // Pola untuk mengambil public_id
        const match = url.match(regex);
        return match ? match[1] : null;
    }
    catch (e) {
        return null;
    }
}
async function getAllThreadByAuthorId(req, res) {
    const { authorId } = req.params;
    const userId = req.user.id;
    try {
        console.log('Fetching threads for authorId:', authorId);
        const threads = await prisma.thread.findMany({
            where: {
                authorId: Number(authorId),
                isDeleted: 0, // Ensure only non-deleted threads are fetched
            },
            include: {
                author: {
                    select: {
                        id: true,
                        fullname: true,
                        username: true,
                        profile: {
                            select: {
                                avatarUrl: true,
                                backgroundUrl: true,
                            },
                        },
                    },
                },
                likes: {
                    select: { userId: true },
                },
                _count: {
                    select: {
                        likes: true,
                        replies: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc', // Sort threads by creation date, latest first
            },
        });
        if (threads.length === 0) {
            return res.status(404).json({
                message: 'No threads found for the given author',
                threads: [],
            });
        }
        const threadsWithLikeStatus = await Promise.all(threads.map(async (thread) => {
            return {
                ...thread,
                isLiked: thread.likes.some((like) => like.userId === userId),
            };
        }));
        res.status(200).json({
            message: 'Threads fetched successfully',
            threads: threadsWithLikeStatus,
        });
    }
    catch (error) {
        console.error('Error fetching threads by author ID:', error);
        res.status(500).json({
            message: 'Error fetching threads by author ID',
            error,
        });
    }
}
async function updateThread(req, res) {
    const threadId = parseInt(req.params.id);
    const { content } = req.body;
    const userId = req.user.id; // Ambil ID pengguna yang login
    let imagePath = null;
    try {
        // Cari thread berdasarkan ID
        const threadExist = await prisma.thread.findUnique({
            where: { id: threadId },
        });
        if (!threadExist) {
            return res.status(404).json({ message: 'Thread not found' });
        }
        // Periksa apakah pengguna adalah penulis thread
        if (threadExist.authorId !== userId) {
            return res
                .status(401)
                .json({ message: 'User not authorized to update this thread' });
        }
        // Jika ada file baru, upload ke Cloudinary
        if (req.file) {
            // Hapus gambar lama dari Cloudinary jika ada
            if (threadExist.image) {
                const publicId = extractPublicId(threadExist.image);
                if (publicId) {
                    await cloudinary_config_1.default.uploader.destroy(publicId);
                }
            }
            const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            const result = await cloudinary_config_1.default.uploader.upload(base64Image, {
                folder: 'threads', // Nama folder di Cloudinary
            });
            imagePath = result.secure_url;
        }
        // Update data thread
        const updatedData = {
            content: content || threadExist.content, // Jika tidak ada konten baru, gunakan konten lama
            image: imagePath || threadExist.image, // Jika tidak ada gambar baru, gunakan gambar lama
        };
        const updatedThread = await prisma.thread.update({
            where: { id: threadId },
            data: updatedData,
        });
        res
            .status(200)
            .json({ message: 'Thread updated successfully', thread: updatedThread });
    }
    catch (error) {
        console.error('Error updating thread:', error);
        res.status(500).json({ message: 'Error updating thread', error });
    }
}
