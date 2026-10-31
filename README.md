# 1923 Từ - Luyện nói từ vựng tiếng Anh

App web (PWA tĩnh) luyện 1.923 từ tiếng Anh thông dụng: nhìn nghĩa tiếng Việt, bấm nút mic và nói từ tiếng Anh trong 3 giây (chế độ Nói) hoặc gõ từ (chế độ Gõ phím), máy tự chấm, nghe phát âm chuẩn, có báo cáo lần 1, kiểm tra lại tới khi hết từ sai và báo cáo tổng hợp. Chạy được trên điện thoại và máy tính, cài lên màn hình chính như một app.

## Cách chia cấp

1.923 từ lấy từ file gốc `raw/2548a81c-1923-tu-tieng-anh-thong-dung_1.xlsx` (sheet "Bản học"), chia thành 8 cấp:

| Cấp trong app | Tên | Lấy từ file | Số từ | Tối đa chế độ Nói (× 3 giây) | Tối đa chế độ Gõ phím |
|---|---|---|---|---|---|
| 1 | Nền tảng | Cấp 1, bài 1-27 | 271 | 13 phút 33 giây | 19 phút 39 giây |
| 2 | Đời sống | Cấp 2, bài 28-54 | 273 | 13 phút 39 giây | 22 phút 19 giây |
| 3, 4, 5 | Thông dụng · Phần 1-3 | Cấp 3, trộn lẫn bài 55-126 | 240 mỗi cấp | 12 phút | 20 phút 32 giây - 20 phút 52 giây |
| 6, 7 | Mở rộng · Phần 1-2 | Cấp 4, trộn lẫn bài 127-192 | 220 mỗi cấp | 11 phút | 19 phút 15 giây - 19 phút 24 giây |
| 8 | Mở rộng · Phần 3 | Cấp 4, trộn lẫn bài 127-192 | 219 | 10 phút 57 giây | 19 phút 25 giây |

Cấp 3 và cấp 4 của file được xáo bằng hạt giống cố định rồi chia đều, nên máy nào cũng ra cùng một bộ từ; 3 cấp Thông dụng gộp lại đủ 720 từ, 3 cấp Mở rộng đủ 659 từ, không trùng.

## 100 cụm từ giao tiếp (từ bản 2.2.0)

- Dữ liệu: `phrases.js`, sinh từ `tai-lieu/100 cụm từ tiếng Anh thông dụng.xlsx` trong vault bằng `tools/build_phrases.py`. Nghĩa tiếng Việt theo bản sếp duyệt (`raw/100cautienganh_moi_1.xlsx`).
- Trong app là một phần riêng nằm dưới 8 cấp, kiểm tra liền **1 lượt 100 cụm**, không chia bài. Cụm từ được nối vào cuối `WORDS` (chỉ số 1923-2022) nên tiến độ cũ không đổi.
- Nói: thời gian nói mỗi từ (mặc định 3 giây) + 1 giây cho mỗi từ sau từ đầu (Me too 4 giây, Don't be mad at me 7 giây). Cả lượt tối đa 8 phút 21 giây (mức 3 giây).
- Gõ phím: 1-2 phím 3 giây, mỗi phím thêm cộng 0,5 giây, làm tròn lên; đếm chữ cái + dấu cách + dấu ' (As soon as possible 12 giây). Cả lượt tối đa 15 phút 1 giây.
- Chấm khi nói: phải nghe ra đủ các từ, đúng thứ tự (nghe thừa tiếng ở đầu, cuối vẫn được). Viết tắt và viết đủ như nhau (I'm = I am), đồng âm như nhau (no/know). Không có "gần đúng".
- Chấm khi gõ: đúng hết từng chữ cái, bắt buộc gõ dấu ', không cần gõ ? ! . , và không phân biệt hoa/thường. Me too / Same here cùng nghĩa "Tôi cũng vậy" nên gõ cụm nào cũng tính đúng.

## Cách kiểm tra

- Bấm vào cấp là vào kiểm tra luôn, một lượt hết cả cấp (thứ tự từ xáo mỗi lần).
- Hai chế độ, chọn ở Cài đặt (mục "Trả lời bằng"): **Nói** và **Gõ phím**. Mỗi chế độ có tiến độ, từ sai, báo cáo lần 1 và báo cáo tổng hợp riêng (`books.voice` và `books.type` trong localStorage). Đổi chế độ không mất tiến độ bên kia; bên chưa làm thì bắt đầu từ từ đầu.
- Nói: mỗi từ 3 giây, chỉnh được 3/4/5/8 giây trong Cài đặt (chỉ áp dụng cho chế độ Nói). Gõ phím: theo độ dài từ, từ 1-2 chữ cái (I, go) 3 giây, mỗi chữ cái thêm cộng 0,5 giây, làm tròn lên (cat 4 giây, family 5 giây, beautiful 7 giây, international 9 giây). Thời gian tối đa cả lượt = cộng thời gian từng từ. Gõ phải đúng hết từng chữ cái (sai 1 chữ là sai), chữ cái gõ sai được tô đỏ.
- Thời gian làm bài tối đa = tổng thời gian trả lời các từ. Đồng hồ chỉ chạy lúc trả lời, không tính lúc máy đọc nghĩa và phát âm. Hết giờ thì từ chưa kịp làm tính là sai.
- Kiểm tra xong lần đầu có **Báo cáo lần 1** (đúng/sai trên tổng số câu, đạt %). Bấm "Kiểm tra lại ... từ sai" để kiểm tra lại những từ còn sai, lặp tới khi hết sai là hoàn thành cấp.
- Hoàn thành cấp: ghi một dòng vào **Báo cáo tổng hợp** của chế độ đang dùng (kết quả lần 1 + số lần kiểm tra lại), rồi xóa danh sách từ sai của cấp đó. Trong báo cáo có nút "Chế độ Nói" / "Chế độ Gõ phím" để xem từng bên.
- Bài đang kiểm tra được lưu sau mỗi từ; tắt app mở lại vẫn kiểm tra tiếp được.
- Mic lỗi giữa bài (vd iPhone báo `service-not-allowed`): app hiện cách sửa theo loại máy (iPhone: cho phép Micrô của Safari, bật Đọc chính tả) và 2 nút **Thử lại mic** / **Gõ phím**. Lúc này đồng hồ không chạy. Thử mic ở Cài đặt cũng hiện cách sửa khi lỗi.

## Các file

- `index.html`, `styles.css`, `app.js`: giao diện và logic.
- `words.js`: dữ liệu 1.923 từ (từ, phiên âm, nghĩa, câu ví dụ). Sinh từ file Excel bằng `tools/dump_xlsx.py` + `tools/build_words.py`.
- `phrases.js`: 100 cụm từ giao tiếp, sinh bằng `tools/build_phrases.py`.
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
