"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const profile_controller_1 = require("../../controllers/profile.controller");
const authentication_1 = require("../../middlewares/authentication");
const multi_uploads_1 = __importDefault(require("../../middlewares/multi-uploads"));
const profileRoute = express_1.default.Router();
profileRoute.post('/', authentication_1.authentication, multi_uploads_1.default, profile_controller_1.createProfile);
profileRoute.put('/', authentication_1.authentication, multi_uploads_1.default, profile_controller_1.updateProfile);
exports.default = profileRoute;
