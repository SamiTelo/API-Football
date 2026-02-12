import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.config';

export const cloudinaryStorage = (folder: string) =>
  new CloudinaryStorage({
    cloudinary,
    params: () => ({
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
      type: 'authenticated', // si tu veux signed URLs
    }),
  });
