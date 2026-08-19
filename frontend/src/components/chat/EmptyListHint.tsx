/**
 * Dòng chữ mờ thay cho danh sách rỗng trong sidebar.
 *
 * Trước đây các danh sách trả về rỗng khi không có dữ liệu, khiến phần dưới mỗi
 * nhãn là một vùng trắng dài tới tận chân sidebar - nhìn như app hỏng chứ không
 * như "bạn chưa có gì ở đây".
 */
const EmptyListHint = ({ children }: { children: React.ReactNode }) => {
  return (
    <p className="text-muted-foreground px-4 py-2 text-xs">{children}</p>
  );
};

export default EmptyListHint;
