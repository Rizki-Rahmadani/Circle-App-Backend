import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  createThread,
  deleteThread,
  getAllThreadByAuthorId,
  getAllThreads,
  getThreadById,
  getThreadByUser,
  updateThread,
} from '../../controllers/thread.controller';
import { authentication } from '../../middlewares/authentication';
// import { upload } from '../../middlewares/upload-file';
import {
  toggleLike,
  getLikeStatus,
  toggleLikeReply,
} from '../../controllers/like.controller';
import {
  createReplies,
  deleteReply,
  getAllReplyByThreadId,
} from '../../controllers/replies.controller';
import upload from '../../middlewares/upload-middleware';

const prisma = new PrismaClient();
const threadRoute = express.Router();

threadRoute.post('/', authentication, upload.single('file'), createThread);
threadRoute.get('/', authentication, getAllThreads);
threadRoute.get('/me', authentication, getThreadByUser);
threadRoute.get('/author/:authorId', authentication, getAllThreadByAuthorId);
threadRoute.get('/:id', authentication, getThreadById);
threadRoute.delete('/:id', authentication, deleteThread);
threadRoute.put('/:id', authentication, upload.single('file'), updateThread);
threadRoute.post('/like', authentication, toggleLike);
threadRoute.post('/like/reply', authentication, toggleLikeReply);
// threadRoute.get('/like/:threadId', authentication, getLikesCount);
threadRoute.post(
  '/reply/:threadId',
  authentication,
  upload.single('file'),
  createReplies,
);
threadRoute.delete('/reply/:replyId', authentication, deleteReply);
threadRoute.get('/reply/:threadId', authentication, getAllReplyByThreadId);
threadRoute.get('/like/status/:threadId', authentication, getLikeStatus);

export default threadRoute;
