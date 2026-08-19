import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFoundPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <h1 className="text-xl font-semibold text-foreground">Không tìm thấy trang này</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Đường dẫn bạn truy cập không tồn tại hoặc đã bị xoá.
      </p>
      <Button asChild>
        <Link to="/">Về trang chủ</Link>
      </Button>
    </div>
  );
};

export default NotFoundPage;
