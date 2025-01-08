import express from 'express';
import {
  createProfile,
  updateProfile,
} from '../../controllers/profile.controller';
import { authentication } from '../../middlewares/authentication';
import multiUpload from '../../middlewares/multi-uploads';

const profileRoute = express.Router();

profileRoute.post('/', authentication, multiUpload, createProfile);
profileRoute.put('/', authentication, multiUpload, updateProfile);
export default profileRoute;
