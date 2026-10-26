# 1923 Từ - Luyện nói từ vựng tiếng Anh

App web (PWA tĩnh) luyện 1.923 từ tiếng Anh thông dụng: nhìn nghĩa tiếng Việt, bấm nút mic và nói từ tiếng Anh trong 3 giây (hoặc gõ phím nếu không có mic), máy tự chấm, nghe phát âm chuẩn, có tổng kết và báo cáo tiến bộ. Chạy được trên điện thoại và máy tính, cài lên màn hình chính như một app.

## Cách chia cấp

Chia đúng như file gốc `raw/2548a81c-1923-tu-tieng-anh-thong-dung_1.xlsx` (sheet "Bản học"): 192 bài, mỗi bài khoảng 10 từ. Trong file, cấp 3 và cấp 4 có 2 phần; mỗi phần là một cấp trong app, nên app có 6 cấp. Mỗi cấp chia thêm thành các chặng, mỗi chặng gồm khoảng 5 bài liền nhau (~50 từ).

| Cấp trong app | Tên | Trong file | Số từ | Bài |
|---|---|---|---|---|
| 1 | Nền tảng | Cấp 1 | 271 | 1-27 |
| 2 | Đời sống | Cấp 2 | 273 | 28-54 |
| 3 | Thông dụng · Phần 1 | Cấp 3, phần 1 | 360 | 55-90 |
| 4 | Thông dụng · Phần 2 | Cấp 3, phần 2 | 360 | 91-126 |
| 5 | Mở rộng · Phần 1 | Cấp 4, phần 1 | 330 | 127-159 |
| 6 | Mở rộng · Phần 2 | Cấp 4, phần 2 | 329 | 160-192 |

Bài kiểm tra cả cấp giới hạn 25 phút. Thời gian trả lời mỗi từ theo độ dài: tới 5 chữ cái 3 giây, 6-8 chữ cái 4 giây, từ 9 chữ cái trở lên 5 giây (tắt được trong Cài đặt).

## Các file

- `index.html`, `styles.css`, `app.js`: giao diện và logic.
- `words.js`: dữ liệu 1.923 từ (từ, phiên âm, nghĩa, câu ví dụ). Sinh từ file Excel bằng `tools/dump_xlsx.py` + `tools/build_words.py`.
- `manifest.webmanifest`, `sw.js`, `icons/`: phần PWA (cài lên máy, mở được khi mất mạng).

## Chạy thử trên máy

```bash
cd "D:/AI Agent/tu-vung-1923"
python -m http.server 8765
```

Mở http://localhost:8765 bằng Chrome hoặc Edge. Mic chỉ chạy trên `localhost` hoặc `https://`.

## Đăng lên mạng (miễn phí)

App chỉ là file tĩnh, đăng ở đâu cũng được, miễn có HTTPS.

### Cách 1: GitHub Pages (khuyên dùng)

1. Đăng nhập GitHub, tạo repo mới tên `tu-vung-1923` (Public, không tick thêm README).
2. Trong thư mục app, chạy (thay `HuuLoc0402` bằng tên GitHub của bạn nếu khác):
   ```bash
   git remote add origin https://github.com/HuuLoc0402/tu-vung-1923.git
   git push -u origin main
   ```
   Lần đầu Git sẽ mở cửa sổ đăng nhập GitHub.
3. Trên GitHub: Settings → Pages → Source: "Deploy from a branch", Branch: `main`, thư mục `/ (root)` → Save.
4. Sau 1-2 phút, app chạy ở `https://HuuLoc0402.github.io/tu-vung-1923/`.

Sửa app sau này: `git add -A && git commit -m "..." && git push`, Pages tự cập nhật. Nhớ tăng số `CACHE` trong `sw.js` để máy người dùng lấy bản mới.

### Cách 2: Netlify

Đăng nhập app.netlify.com → Add new site → Deploy manually → kéo thả cả thư mục `tu-vung-1923` vào. Có link `https://<tên>.netlify.app` ngay.

### Cách 3: Vercel

Đăng nhập vercel.com → Add New Project → Import repo GitHub ở cách 1 (Framework: Other, không cần build).

## Giới hạn cần biết

- Nhận giọng nói (Web Speech API) chạy tốt nhất trên **Chrome/Edge** (Android, Windows, Mac) và cần **Internet**.
- **Safari iPhone/iPad** nhận giọng còn chập chờn; Firefox không có. Khi đó app chuyển sang trả lời bằng **gõ phím**, máy vẫn tự chấm.
- Đọc tiếng Việt cần máy có giọng vi-VN (Android, Windows có sẵn "Microsoft An"; iPhone có sẵn).
- Tiến độ lưu trong `localStorage` của từng trình duyệt, không đồng bộ giữa các máy. Dùng Báo cáo → Xuất/Nhập dữ liệu để chuyển máy.
