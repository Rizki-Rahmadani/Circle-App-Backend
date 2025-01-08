"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const storage = multer_1.default.memoryStorage();
// Modifikasi untuk mendukung multiple upload dengan field yang berbeda (avatar dan background)
const multiUpload = (0, multer_1.default)({ storage }).fields([
    { name: 'avatar', maxCount: 1 }, // Maksimal 1 file untuk 'avatar'
    { name: 'background', maxCount: 1 }, // Maksimal 1 file untuk 'background'
    { name: 'file', maxCount: 1 }, // Maksimal 1 file untuk 'background'
]);
exports.default = multiUpload;
