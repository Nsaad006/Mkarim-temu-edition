import { Router } from 'express';
import { upload, processImage, processImages } from '../middleware/upload';
import { authenticate, authorize } from './auth';
import { PERMISSIONS } from '../constants/permissions';

const router = Router();

// POST /api/upload/product-image (single)
router.post('/product-image',
    authenticate,
    authorize(['super_admin', 'editor'], [PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.PRODUCTS_EDIT]),
    upload.single('image'),
    processImage,
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Use the filename provided by the processing middleware (which will be a .webp file)
        const imageUrl = `/uploads/products/${(req.file as any).filename}`;
        res.json({ imageUrl });
    }
);

// POST /api/upload/product-images (multiple - max 6)
router.post('/product-images',
    authenticate,
    authorize(['super_admin', 'editor'], [PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.PRODUCTS_EDIT]),
    upload.array('images', 6),  // Max 6 images
    processImages,
    (req, res) => {
        const files = (req as any).files;
        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        // Return array of file paths from processed files
        const imageUrls = files.map((file: any) => `/uploads/products/${file.filename}`);
        res.json({ imageUrls });
    }
);

export default router;
