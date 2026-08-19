import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUserStore } from '@/stores/useUserStore';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // Phải khớp với giới hạn của multer ở backend
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Nút đổi ảnh đại diện, đặt chồng lên góc avatar.
 * Kiểm tra dung lượng và định dạng ngay ở client để người dùng biết lỗi lập tức
 * thay vì phải chờ backend trả về 400.
 */
const AvatarUploader = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const updateAvatarUrl = useUserStore((state) => state.updateAvatarUrl);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset ngay để chọn lại đúng file vừa rồi vẫn kích hoạt onChange.
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Chỉ chấp nhận ảnh JPEG, PNG, WEBP hoặc GIF');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Ảnh vượt quá 2MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      await updateAvatarUrl(formData);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Đổi ảnh đại diện"
        className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full bg-background/90 text-foreground shadow-md ring-2 ring-white transition hover:bg-background disabled:cursor-not-allowed"
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
};

export default AvatarUploader;
