import multer from 'multer';

const storage = multer.memoryStorage();

// Modifikasi untuk mendukung multiple upload dengan field yang berbeda (avatar dan background)
const multiUpload = multer({ storage }).fields([
  { name: 'avatar', maxCount: 1 }, // Maksimal 1 file untuk 'avatar'
  { name: 'background', maxCount: 1 }, // Maksimal 1 file untuk 'background'
  { name: 'file', maxCount: 1 }, // Maksimal 1 file untuk 'background'
]);

export default multiUpload;
