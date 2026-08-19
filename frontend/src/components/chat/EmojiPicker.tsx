import { Suspense, lazy, useEffect, useState } from 'react';
import { Smile } from 'lucide-react';
import { useThemeStore } from '@/stores/useThemeStore';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

/**
 * emoji-mart cùng bộ dữ liệu của nó nặng gần 1MB.
 * Nạp động chỉ khi người dùng thực sự mở bảng emoji, để bundle khởi động của
 * ứng dụng không phải gánh phần này.
 */
const Picker = lazy(() => import('@emoji-mart/react'));

interface EmojiPickerProps {
  onChange: (emoji: string) => void;
}

interface EmojiSelection {
  native: string;
}

const EmojiPicker = ({ onChange }: EmojiPickerProps) => {
  const isDark = useThemeStore((state) => state.isDark);
  const [open, setOpen] = useState(false);
  const [emojiData, setEmojiData] = useState<unknown>(null);

  useEffect(() => {
    if (!open || emojiData) return;
    let cancelled = false;
    import('@emoji-mart/data').then((module) => {
      if (!cancelled) setEmojiData(module.default);
    });
    return () => {
      cancelled = true;
    };
  }, [open, emojiData]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="cursor-pointer" aria-label="Chọn emoji">
        <Smile className="size-4" />
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        className="w-auto border-none bg-transparent p-0 shadow-none drop-shadow-none"
      >
        <Suspense fallback={<div className="p-4 text-xs text-muted-foreground">Đang tải emoji...</div>}>
          {emojiData ? (
            <Picker
              data={emojiData}
              theme={isDark ? 'dark' : 'light'}
              previewPosition="none"
              onEmojiSelect={(emoji: EmojiSelection) => onChange(emoji.native)}
            />
          ) : (
            <div className="p-4 text-xs text-muted-foreground">Đang tải emoji...</div>
          )}
        </Suspense>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
