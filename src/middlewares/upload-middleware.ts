import multer from 'multer';

const storage = multer.memoryStorage(); // Simpan file dalam memory (buffer)

const upload = multer({ storage });

export default upload;
