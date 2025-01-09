import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import cloudinary from '../config/cloudinary.config';

const prisma = new PrismaClient();

export async function getAllUsers(req: Request, res: Response) {
  const loggedInUserId = (req as any).user.id;

  try {
    const allUsers = await prisma.user.findMany({
      where: { id: { not: loggedInUserId } },
      include: {
        profile: {
          select: {
            bio: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
        followers: true,
        following: true,
      },
    });

    res.json({ message: 'Get all users successfully', users: allUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
}

export async function updateUser(req: Request, res: Response) {
  const loggedInUserId = (req as any).user.id;
  let avatarPath: string | null = null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: loggedInUserId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { username, fullname, email, bio } = req.body;

    const updatedData: any = {
      username: username || user.username,
      fullname: fullname || user.fullname,
      email: email || user.email,
    };

    // Check if a file is uploaded
    if (req.file) {
      // Validate file type
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          message: 'Invalid file type. Only JPEG, PNG, and GIF are allowed.',
        });
      }

      // Upload to Cloudinary
      try {
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const result = await cloudinary.uploader.upload(base64Image, {
          folder: 'avatar',
        });
        avatarPath = result.secure_url;
        updatedData.avatarUrl = avatarPath; // Save new avatar URL
      } catch (error) {
        return res
          .status(500)
          .json({ message: 'Error uploading avatar to Cloudinary', error });
      }
    }

    // Update user data in the database
    await prisma.user.update({
      where: { id: loggedInUserId },
      data: updatedData,
    });

    // Check if profile exists before updating
    if (user.profile) {
      await prisma.profile.update({
        where: { userId: loggedInUserId },
        data: {
          bio: bio || user.profile.bio,
          avatarUrl: avatarPath || user.profile.avatarUrl,
        },
      });
    } else {
      await prisma.profile.create({
        data: {
          bio: bio || '',
          avatarUrl: avatarPath || null,
          userId: loggedInUserId,
        },
      });
    }

    res.status(200).json({
      message: 'User updated successfully',
      user: {
        email: updatedData.email,
        username: updatedData.username,
        fullname: updatedData.fullname,
        avatarUrl: avatarPath || user.profile?.avatarUrl,
        bio: bio || user.profile?.bio,
      },
    });
  } catch (error) {
    return res.status(400).json({ message: 'Error updating user', error });
  }
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;

  const userId = parseInt(id, 10);

  // Cek apakah thread ada
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!userExists) {
    return res.status(404).json({ message: 'User not found.' });
  }

  // Hapus thread
  await prisma.user.delete({
    where: { id: userId },
  });
  res.status(200).json({ message: 'user deleted' });
}

export async function getCurrentUser(req: Request, res: Response) {
  const userId = (req as any).user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        followers: {
          include: {
            follower: {
              // Mendapatkan detail follower dari relasi
              select: {
                id: true,
                username: true,
                fullname: true,
                profile: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        following: {
          include: {
            following: {
              // Mendapatkan detail following dari relasi
              select: {
                id: true,
                username: true,
                fullname: true,
                profile: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Map data followers dan following agar sesuai dengan format yang diinginkan
    const followers = user.followers.map((followerRel) => ({
      id: followerRel.follower.id,
      username: followerRel.follower.username,
      fullname: followerRel.follower.fullname,
      avatarUrl: followerRel.follower.profile?.avatarUrl || '',
    }));

    const following = user.following.map((followingRel) => ({
      id: followingRel.following.id,
      username: followingRel.following.username,
      fullname: followingRel.following.fullname,
      avatarUrl: followingRel.following.profile?.avatarUrl || '',
    }));

    const { profile } = user;

    res.status(200).json({
      id: user.id,
      email: user.email,
      username: user.username,
      fullname: user.fullname,
      bio: profile?.bio || '',
      avatarUrl: profile?.avatarUrl || '',
      backgroundUrl: profile?.backgroundUrl || '',
      followersCount: user._count.followers,
      followingCount: user._count.following,
      followers,
      following,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching user', error });
  }
}

export async function getSuggestedUsers(req: Request, res: Response) {
  const userId = (req as any).user.id;

  try {
    // Ambil daftar pengguna yang diikuti oleh pengguna yang sedang login
    const following = await prisma.followUser.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map((follow) => follow.followingId);

    // Ambil pengguna yang mengikuti pengguna yang sedang login
    const followers = await prisma.followUser.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });

    const followerIds = followers.map((follow) => follow.followerId);

    // Ambil pengguna yang mengikuti pengguna yang sedang login dan urutkan berdasarkan jumlah followers
    const followedUsers = await prisma.user.findMany({
      where: {
        id: { in: followerIds },
        NOT: {
          id: {
            in: [userId, ...followingIds], // Jangan sertakan pengguna yang sedang login atau yang sudah diikuti
          },
        },
      },
      include: {
        profile: {
          select: {
            avatarUrl: true,
          },
        },
        _count: {
          select: { followers: true },
        },
      },
    });

    // Ambil pengguna yang tidak mengikuti pengguna yang sedang login atau diikuti oleh pengguna yang sedang login
    const nonFollowedUsers = await prisma.user.findMany({
      where: {
        NOT: {
          id: {
            in: [
              ...followerIds,
              ...followingIds,
              userId, // Gabungkan semua ID yang harus dikecualikan
            ],
          },
        },
      },
      include: {
        profile: {
          select: {
            avatarUrl: true,
          },
        },
        _count: {
          select: { followers: true },
        },
      },
    });

    // Gabungkan kedua grup dan urutkan berdasarkan jumlah followers
    const suggestedUsers = [
      ...followedUsers.sort((a, b) => b._count.followers - a._count.followers),
      ...nonFollowedUsers.sort(
        (a, b) => b._count.followers - a._count.followers,
      ),
    ];

    res.status(200).json({
      message: 'Suggested users fetched successfully',
      users: suggestedUsers,
    });
  } catch (error) {
    console.error('Error fetching suggested users:', error);
    res.status(500).json({ message: 'Error fetching suggested users' });
  }
}

export async function getUserById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: {
        profile: true, // Include profile untuk mengambil bio dan avatarUrl
        followers: {
          select: {
            followerId: true,
          },
        },
        following: {
          select: {
            followingId: true,
          },
        },
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { profile } = user;

    res.status(200).json({
      id: user.id,
      email: user.email,
      username: user.username,
      fullname: user.fullname,
      profile: {
        backgroundUrl: profile?.backgroundUrl || '',
        avatarUrl: profile?.avatarUrl || '',
        bio: profile?.bio || '',
      },
      followersCount: user._count.followers,
      followingCount: user._count.following,
    });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ message: 'Error fetching user by ID', error });
  }
}
