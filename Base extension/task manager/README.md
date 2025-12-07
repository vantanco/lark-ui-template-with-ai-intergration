# Hướng dẫn dùng template & Lark SDK bridge

## Khi thay UI mới
1) Bạn có thể xóa UI hiện tại và thêm UI của riêng bạn. Giữ nguyên thư mục `ui_larksdk_bridge` và các service SDK.
2) Trong UI mới, dùng `fetchCurrentRecordSample()` (ở `ui_larksdk_bridge/fetchCurrentRecordSample`) để lấy dữ liệu mẫu từ bảng đang mở, in ra console/panel để hiểu schema thực.
3) Sau đó ghép dữ liệu thật:
   - Dùng `fetchProjectsFromBitable()` (trong `src/services/bitableProjectService.ts`) hoặc tự viết mapper từ SDK.
   - CRUD: `addRecordByFieldNames`, `deleteRecordById`, `setSingleSelectWithFallback` (trong `ui_larksdk_bridge/templates/api.ts`).
   - Realtime: `subscribeRecordChanges` (trong `ui_larksdk_bridge/templates/changeListener.js`) để lắng nghe add/modify/delete và schema change; nhớ gọi `unsubscribe()` khi unmount.
4) Giữ các stub trong `stubs/` để dev server không lỗi phụ thuộc private. Nếu cần key AI, đặt trong `.env.local` hoặc chỉnh `geminiService.ts`.

## Thư mục bridge
- `ui_larksdk_bridge/fetchCurrentRecordSample.ts`: lấy record mẫu từ bảng (không qua view), trả về selection/fields/data.
- `ui_larksdk_bridge/useBitableContext.ts`: hook React lấy context/selection, cập nhật khi selection đổi.
- `ui_larksdk_bridge/templates/api.ts`: wrapper SDK thuần JS (getSelection, currentUser, CRUD, record link...).
- `ui_larksdk_bridge/templates/changeListener.js`: đăng ký listener realtime record/field (base + table), trả về `unsubscribe`.

## Mẹo nhanh
- Để debug dữ liệu: gọi `fetchCurrentRecordSample()` và log ra console.
- Để patch realtime: `subscribeRecordChanges({ onRecords: async () => setProjects(await fetchProjectsFromBitable()) })`.
- Để tạo record qua SDK: `addRecordByFieldNames({ Name: 'Task A', Status: 'Pending', ... })`.

Giữ file này và bridge để bất kỳ UI mới nào cũng có thể nối SDK nhanh chóng.***
