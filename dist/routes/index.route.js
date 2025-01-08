"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_route_1 = __importDefault(require("./v1/user.route"));
const auth_route_1 = __importDefault(require("./v1/auth.route"));
const thread_route_1 = __importDefault(require("./v1/thread.route"));
const profile_route_1 = __importDefault(require("./v1/profile.route"));
const router = express_1.default.Router();
router.use('/users', user_route_1.default);
router.use('/auth', auth_route_1.default);
router.use('/thread', thread_route_1.default);
router.use('/profile', profile_route_1.default);
exports.default = router;
