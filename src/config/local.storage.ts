import { diskStorage } from 'multer';
import { extname } from 'path';

export const localStorage = (folder: string) => ({
  storage: diskStorage({
    destination: `./private_uploads/${folder}`,
    filename: (_req, file, cb) => {
      cb(null, Date.now() + extname(file.originalname));
    },
  }),
});
