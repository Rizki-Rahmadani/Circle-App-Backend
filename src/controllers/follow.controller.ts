import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export const toggleFollow = async (req: Request, res: Response) => {
  const { targetUserId } = req.body; // ID pengguna yang ingin di-follow/unfollow
  const userId = (req as any).user.id; // ID pengguna yang login (diambil dari token autentikasi)

  try {
    // Validasi input
    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user ID is required' });
    }

    if (userId === targetUserId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    // Cek apakah target user ada
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Gunakan transaksi untuk toggle follow
    const result = await prisma.$transaction(async (prisma) => {
      const existingFollow = await prisma.followUser.findFirst({
        where: {
          followerId: userId,
          followingId: targetUserId,
        },
      });

      if (existingFollow) {
        // Jika sudah follow, hapus follow
        await prisma.followUser.delete({
          where: { id: existingFollow.id },
        });

        return { isFollowing: false };
      } else {
        // Jika belum follow, tambahkan follow
        await prisma.followUser.create({
          data: {
            followerId: userId,
            followingId: targetUserId,
          },
        });

        return { isFollowing: true };
      }
    });

    // Hitung jumlah followers dan following setelah toggle
    const followerCount = await prisma.followUser.count({
      where: { followingId: targetUserId },
    });

    const followingCount = await prisma.followUser.count({
      where: { followerId: userId },
    });

    const message = result.isFollowing ? 'User followed' : 'User unfollowed';

    return res.status(200).json({
      message,
      followerCount,
      followingCount,
    });
  } catch (error) {
    console.error('Error in toggleFollow:', error);
    return res.status(500).json({ message: 'Internal server error', error });
  }
};

export const getFollowedUsers = async (req: Request, res: Response) => {
  const userId = (req as any).user.id; // Get the logged-in user's ID from the token

  try {
    const followedUsers = await prisma.followUser.findMany({
      where: { followerId: userId },
      include: {
        following: {
          include: {
            profile: true, // Include profile to get the avatar
          },
        },
      },
    });

    const followedUserData = followedUsers.map((follow) => ({
      ...follow.following,
      avatarUrl: follow.following.profile?.avatarUrl, // Get avatar from profile
    }));

    return res.status(200).json(followedUserData);
  } catch (error) {
    console.error('Error fetching followed users:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get followers
export const getFollowers = async (req: Request, res: Response) => {
  const userId = (req as any).user.id; // Get the logged-in user's ID from the token

  try {
    const followers = await prisma.followUser.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          include: {
            profile: true, // Include profile to get the avatar
          },
        }, // Include the user data for the followers
      },
    });

    const followerData = followers.map((follow) => ({
      ...follow.follower,
      avatarUrl: follow.follower.profile?.avatarUrl, // Get avatar from profile
    }));

    return res.status(200).json(followerData);
  } catch (error) {
    console.error('Error fetching followers:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
