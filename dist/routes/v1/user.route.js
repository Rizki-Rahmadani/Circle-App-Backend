"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("../../controllers/user.controller");
const authentication_1 = require("../../middlewares/authentication");
const follow_controller_1 = require("../../controllers/follow.controller");
const multi_uploads_1 = __importDefault(require("../../middlewares/multi-uploads"));
const userRoute = express_1.default.Router();
// Routes
userRoute.get('/', authentication_1.authentication, user_controller_1.getAllUsers);
userRoute.get('/me', authentication_1.authentication, user_controller_1.getCurrentUser);
userRoute.get('/author/:id', authentication_1.authentication, user_controller_1.getUserById);
userRoute.put('/', authentication_1.authentication, multi_uploads_1.default, user_controller_1.updateUser);
userRoute.delete('/:id', user_controller_1.deleteUser);
userRoute.post('/follow', authentication_1.authentication, follow_controller_1.toggleFollow);
userRoute.get('/following', authentication_1.authentication, follow_controller_1.getFollowedUsers);
userRoute.get('/followers', authentication_1.authentication, follow_controller_1.getFollowers);
userRoute.get('/suggested', authentication_1.authentication, user_controller_1.getSuggestedUsers);
exports.default = userRoute;
