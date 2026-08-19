import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 2, // 2MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Chỉ chấp nhận ảnh JPEG, PNG, WEBP hoặc GIF'));
    }
    return cb(null, true);
  },
});

export const uploadImageFromBuffer = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({
      folder: "moji_chat/avatars",
      resource_type: "image",
      transformation: [{ width: 200, height: 200, crop: "fill" }],
      ...options,
    }, (error, result) => {
      if (error) reject(error)
      else resolve(result)
    })
    uploadStream.end(buffer)
  })
}

export const destroyImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    // Ảnh cũ không xoá được không nên làm hỏng request cập nhật avatar.
    console.error("Không xoá được ảnh cũ trên Cloudinary", error);
  }
}
