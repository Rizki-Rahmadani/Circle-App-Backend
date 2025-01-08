import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import cloudinary from '../config/cloudinary.config';

const prisma = new PrismaClient();

export async function createProfile(req: Request, res: Response) {
  const { bio } = req.body;
  const userId = (req as any).user.id; // Assumes userId is retrieved from authenticated user

  const existingProfile = await prisma.profile.findUnique({
    where: { userId },
  });
  if (existingProfile) {
    return res.status(400).json({ message: 'Profile already exists' });
  }

  let avatarPath: string | null = null;

  if (req.file) {
    try {
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const result = await cloudinary.uploader.upload(base64Image, {
        folder: 'profile', // Nama folder di Cloudinary
      });
      avatarPath = result.secure_url;
    } catch (error) {
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating profile' });
  }
}

export async function updateProfile(req: Request, res: Response) {
  const userId = (req as any).user.id; // Pastikan id user diambil dari JWT atau session
  const { bio, username, fullname } = req.body;

  let avatarPath: string | null = null;
  let backgroundPath: string | null = null;

  // Handle avatar image upload (jika ada file dengan fieldname 'avatar')
  if (req.files && (req.files as any).avatar) {
    const avatarFile = (req.files as any).avatar[0];
    try {
      const base64Image = `data:${avatarFile.mimetype};base64,${avatarFile.buffer.toString('base64')}`;
      const result = await cloudinary.uploader.upload(base64Image, {
        folder: 'profile/avatars',
      });
      avatarPath = result.secure_url;
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Error uploading avatar to Cloudinary', error });
    }
  }

  // Handle background image upload (jika ada file dengan fieldname 'background')
  if (req.files && (req.files as any).background) {
    const backgroundFile = (req.files as any).background[0];
    try {
      const base64Image = `data:${backgroundFile.mimetype};base64,${backgroundFile.buffer.toString('base64')}`;
      const result = await cloudinary.uploader.upload(base64Image, {
        folder: 'profile/background',
      });
      backgroundPath = result.secure_url;
    } catch (error) {
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

    if (existingProfile) {
      // Update existing profile
      const updatedProfile = await prisma.profile.update({
        where: { userId: userId },
        data: {
          bio: bio || existingProfile.bio,
          avatarUrl: avatarPath || existingProfile.avatarUrl,
          backgroundUrl: backgroundPath || existingProfile.backgroundUrl,
        },
      });

      res.status(200).json({
        message: 'Profile updated successfully',
        data: { updatedUser, updatedProfile },
      });
    } else {
      // Create a new profile if it doesn't exist
      const newProfile = await prisma.profile.create({
        data: {
          bio: bio || '',
          avatarUrl: avatarPath || null,
          backgroundUrl: backgroundPath || null,
          userId: userId,
        },
      });

      res.status(201).json({
        message: 'Profile created successfully',
        data: { updatedUser, newProfile },
      });
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ message: 'Error updating profile', error });
  }
}
