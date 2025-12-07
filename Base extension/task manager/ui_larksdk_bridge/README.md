# Lark SDK bridge / templates

Thư mục này giúp UI mới nói chuyện với Bitable dễ hơn. Bạn chỉ cần lấy sẵn các hàm ở đây, không phải mò API thô.

## Có gì trong đây?
- `useBitableContext.ts`: Hook React lấy bối cảnh đang mở bảng/view nào và cập nhật khi bạn đổi selection.
- `templates/api.ts`: Bộ hàm mẫu để đọc/ghi nhanh:
  - Lấy selection, kiểm tra SDK, lấy user hiện tại.
  - Thêm record mới theo tên cột, xóa record, đặt giá trị single-select, lấy link record.
  - Hàm debug `fetchCurrentRecordSample()` đọc record hiện tại/đầu tiên và trả về dữ liệu đã đổi ra chữ để bạn xem thử.
- `templates/changeListener.js`: Đăng ký lắng nghe thay đổi record/field từ Bitable (base + table). Trả về hàm `unsubscribe`.

## Dùng ra sao?
1) Trong component, gọi `useBitableContext()` để biết bạn đang đứng ở bảng/view nào.
2) Muốn xem dữ liệu thật để chỉnh UI: gọi `fetchCurrentRecordSample()` rồi in ra console.
3) Muốn tạo/sửa record: dùng `addRecordByFieldNames({ Name: 'Task A', Status: 'In Progress' })`, hoặc `setSingleSelectWithFallback(...)`, `deleteRecordById(...)`.
4) Nếu cần link chia sẻ: `getRecordLink(recordId)`.
5) Muốn bắt sự kiện realtime: 
   ```js
   import { subscribeRecordChanges } from '../ui_larksdk_bridge/templates/changeListener';
   import { fetchProjectsFromBitable } from '../services/bitableProjectService';

   const unsubscribe = subscribeRecordChanges({
     onRecords: async ({ ids }) => {
       // đơn giản: reload toàn bộ dữ liệu từ Bitable
       const latest = await fetchProjectsFromBitable();
       setProjects(latest); // cập nhật state UI
     },
     onSchema: async () => {
       // đổi cột → reload toàn bộ
       const latest = await fetchProjectsFromBitable();
       setProjects(latest);
     },
     onError: (err) => console.warn('listener error', err),
   });
   // gọi unsubscribe() khi unmount
   ```

## Lưu ý nhẹ
- Các hàm này dựa trên SDK `@lark-opdev/block-bitable-api` (đã có trong dự án).
- Khi đổi UI khác, chỉ cần import lại các hàm/hook này; không phải đụng gì tới cấu hình build.
