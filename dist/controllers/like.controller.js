"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleLikeReply = exports.getLikeStatus = exports.toggleLike = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const toggleLike = async (req, res) => {
    const { threadId } = req.body;
    const userId = req.user.id;
    try {
        // Validasi input
        if (!threadId) {
            return res.status(400).json({ message: 'threadId is required' });
        }
        // Cek apakah thread ada
        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
        });
        if (!thread) {
            return res.status(404).json({ message: 'Thread not found' });
        }
        // Cek apakah user sudah like thread ini
        const existingLike = await prisma.userLike.findFirst({
            where: {
                userId,
                threadId,
            },
        });
        // Menggunakan transaksi untuk toggle like dan mendapatkan likeCount terbaru
        const { likeCount } = await prisma.$transaction(async (prisma) => {
            let likeCount = await prisma.userLike.count({
                where: { threadId },
            });
            if (existingLike) {
                // Jika sudah like, hapus like
                await prisma.userLike.delete({
                    where: {
                        id: existingLike.id,
                    },
                });
                likeCount--; // Decrement jumlah like setelah like dihapus
            }
            else {
                // Jika belum like, tambahkan like
                await prisma.userLike.create({
                    data: {
                        userId,
                        threadId,
                    },
                });
                likeCount++; // Increment jumlah like setelah like ditambahkan
            }
            return { likeCount };
        });
        // Menentukan pesan berdasarkan ada atau tidaknya like sebelumnya
        const message = existingLike ? 'Thread Unliked' : 'Thread Liked';
        // Mengirim respons dengan message, jumlah like terbaru, dan status isLiked
        return res.status(200).json({
            message,
            likeCount,
            isLiked: !existingLike, // Mengembalikan true jika baru saja like, false jika unliked
        });
    }
    catch (error) {
        console.error('Error toggling like:', error);
        return res.status(500).json({ message: 'Internal server error', error });
    }
};
exports.toggleLike = toggleLike;
// Fungsi untuk mendapatkan status like
const getLikeStatus = async (req, res) => {
    const { threadId } = req.params; // Mengambil threadId dari parameter URL
    const userId = req.user.id;
    try {
        // Validasi input
        if (!threadId) {
            return res.status(400).json({ message: 'threadId is required' });
        }
        // Cek apakah user sudah like thread ini
        const existingLike = await prisma.userLike.findFirst({
            where: {
                userId,
                threadId: parseInt(threadId), // Pastikan threadId adalah integer
            },
        });
        // Mengirim respons apakah user sudah like atau belum
        return res.status(200).json({
            isLiked: !!existingLike, // Mengembalikan true jika sudah like, false jika belum
        });
    }
    catch (error) {
        console.error('Error checking like status:', error);
        return res.status(500).json({ message: 'Internal server error', error });
    }
};
exports.getLikeStatus = getLikeStatus;
const toggleLikeReply = async (req, res) => {
    const { replyId } = req.body;
    const userId = req.user.id;
    try {
        // Validasi input
        if (!replyId) {
            return res.status(400).json({ message: 'replyId is required' });
        }
        // Cek apakah reply ada
        const reply = await prisma.reply.findUnique({
            where: { id: replyId },
        });
        if (!reply) {
            return res.status(404).json({ message: 'Reply not found' });
        }
        // Cek apakah user sudah like reply ini
        const existingLike = await prisma.userLike.findFirst({
            where: {
                userId,
                replyId,
            },
        });
        // Menggunakan transaksi untuk toggle like
        const { likeCount } = await prisma.$transaction(async (prisma) => {
            let likeCount = await prisma.userLike.count({
                where: { replyId },
            });
            if (existingLike) {
                // Jika sudah like, hapus like
                await prisma.userLike.delete({
                    where: {
                        id: existingLike.id,
                    },
                });
                likeCount--; // Decrement jumlah like setelah like dihapus
            }
            else {
                // Jika belum like, tambahkan like
                await prisma.userLike.create({
                    data: {
                        userId,
                        replyId,
                    },
                });
                likeCount++; // Increment jumlah like setelah like ditambahkan
            }
            return { likeCount };
        });
        // Menentukan pesan berdasarkan ada atau tidaknya like sebelumnya
        const message = existingLike ? 'Reply Unliked' : 'Reply Liked';
        // Mengirim respons dengan message dan jumlah like terbaru
        return res.status(200).json({
            message,
            likeCount,
            isLiked: !existingLike, // Mengembalikan true jika baru saja like, false jika unliked
        });
    }
    catch (error) {
        console.error('Error toggling like on reply:', error);
        return res.status(500).json({ message: 'Internal server error', error });
    }
};
exports.toggleLikeReply = toggleLikeReply;
