import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

// Memory storage is better for processing images with sharp
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for original uploads
});

const UPLOAD_PATH = 'uploads/products';

// Ensure the directory exists
if (!fs.existsSync(UPLOAD_PATH)) {
    fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

export const processImage = async (req: Request, res: Response, Next: NextFunction) => {
    if (!req.file) return Next();

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `product-${uniqueSuffix}.webp`;
    const outputPath = path.join(UPLOAD_PATH, filename);

    try {
        await sharp(req.file.buffer)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(outputPath);
        
        // Update the file object so subsequent middleware (like the route handler) knows the new filename
        (req.file as any).filename = filename;
        (req.file as any).path = outputPath;
        Next();
    } catch (error) {
        Next(error);
    }
};

export const processImages = async (req: Request, res: Response, Next: NextFunction) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) return Next();

    try {
        const processedFiles: any[] = [];

        for (const file of req.files) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const filename = `product-${uniqueSuffix}.webp`;
            const outputPath = path.join(UPLOAD_PATH, filename);

            await sharp(file.buffer)
                .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(outputPath);
            
            processedFiles.push({
                ...file,
                filename,
                path: outputPath
            });
        }

        (req as any).files = processedFiles;
        Next();
    } catch (error) {
        Next(error);
    }
};
