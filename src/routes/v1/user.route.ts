import express from 'express';
import {
  deleteUser,
  getAllUsers,
  getCurrentUser,
  updateUser,
  getSuggestedUsers,
  getUserById,
} from '../../controllers/user.controller';
import { authentication } from '../../middlewares/authentication';
import {
  getFollowedUsers,
  getFollowers,
  toggleFollow,
} from '../../controllers/follow.controller';
import upload from '../../middlewares/upload-middleware';
import multiUpload from '../../middlewares/multi-uploads';

const userRoute = express.Router();

// Routes
userRoute.get('/', authentication, getAllUsers);
userRoute.get('/me', authentication, getCurrentUser);
userRoute.get('/author/:id', authentication, getUserById);
userRoute.put('/', authentication, multiUpload, updateUser);
userRoute.delete('/:id', deleteUser);
userRoute.post('/follow', authentication, toggleFollow);
userRoute.get('/following', authentication, getFollowedUsers);
userRoute.get('/followers', authentication, getFollowers);
userRoute.get('/suggested', authentication, getSuggestedUsers);

export default userRoute;
