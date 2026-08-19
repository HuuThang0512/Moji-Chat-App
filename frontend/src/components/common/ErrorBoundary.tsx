import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "../ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Chặn lỗi render của toàn bộ cây component.
 * Không có nó, một lỗi trong bất kỳ component nào cũng làm React unmount sạch
 * và người dùng chỉ thấy trang trắng, không có cách nào phục hồi.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Lỗi không bắt được trong giao diện", error, info.componentStack);
  }

  handleReload = () => {
    window.location.assign("/");
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Đã có lỗi xảy ra</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Giao diện gặp sự cố ngoài dự kiến. Bạn có thể tải lại trang để tiếp tục.
        </p>
        {import.meta.env.DEV && (
          <pre className="max-w-xl overflow-x-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}
        <Button onClick={this.handleReload}>Tải lại trang</Button>
      </div>
    );
  }
}

export default ErrorBoundary;
