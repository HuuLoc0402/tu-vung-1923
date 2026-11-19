# 1923 Từ - Luyện nói từ vựng tiếng Anh

App web (PWA tĩnh) luyện 1.923 từ tiếng Anh thông dụng: nhìn nghĩa tiếng Việt, bấm nút mic và nói từ tiếng Anh trong 3 giây (chế độ Nói) hoặc gõ từ (chế độ Gõ phím), máy tự chấm, nghe phát âm chuẩn, có báo cáo lần 1, kiểm tra lại tới khi hết từ sai và báo cáo tổng hợp. Chạy được trên điện thoại và máy tính, cài lên màn hình chính như một app.

## Cách chia cấp

1.923 từ lấy từ file gốc `raw/2548a81c-1923-tu-tieng-anh-thong-dung_1.xlsx` (sheet "Bản học"), chia thành 13 cấp (từ bản 2.4.4; trước đó 8 cấp). Tên cấp là số từ của cấp đó, không cấp nào trùng số. Bên trong app mỗi cấp có số thứ tự 1-13 để lưu tiến độ (100 cụm là 14, 96 câu là 15):

| Cấp trong app | Tên | Lấy từ file | Số từ | Tối đa chế độ Nói (× 3 giây) | Tối đa chế độ Gõ phím |
|---|---|---|---|---|---|
| 271 | Nền tảng | Cấp 1, bài 1-27 | 271 | 13 phút 33 giây | 19 phút 39 giây |
| 273 | Đời sống | Cấp 2, bài 28-54 | 273 | 13 phút 39 giây | 22 phút 19 giây |
| 240 | Thông dụng | Cấp 3, bài 55-78 | 240 | 12 phút | 21 phút 8 giây |
| 119 | Thông dụng | Cấp 3, bài 79-90 | 119 | 5 phút 57 giây | 10 phút 6 giây |
| 121 | Thông dụng | Cấp 3, bài 90-102 | 121 | 6 phút 3 giây | 10 phút 12 giây |
| 118 | Thông dụng | Cấp 3, bài 103-114 | 118 | 5 phút 54 giây | 10 phút 21 giây |
| 122 | Thông dụng | Cấp 3, bài 114-126 | 122 | 6 phút 6 giây | 10 phút 12 giây |
| 111 | Mở rộng | Cấp 4, bài 127-138 | 111 | 5 phút 33 giây | 10 phút 15 giây |
| 109 | Mở rộng | Cấp 4, bài 138-148 | 109 | 5 phút 27 giây | 9 phút 57 giây |
| 112 | Mở rộng | Cấp 4, bài 149-160 | 112 | 5 phút 36 giây | 10 phút |
| 108 | Mở rộng | Cấp 4, bài 160-170 | 108 | 5 phút 24 giây | 9 phút 15 giây |
| 113 | Mở rộng | Cấp 4, bài 171-182 | 113 | 5 phút 39 giây | 9 phút 28 giây |
| 106 | Mở rộng | Cấp 4, bài 182-192 (bài 192 có 9 từ) | 106 | 5 phút 18 giây | 9 phút 9 giây |

Từ bản 2.4.2 cấp 3 và cấp 4 của file chia theo đúng thứ tự bài từ trên xuống, không trộn nữa: Thông dụng mỗi cấp 24 bài, Mở rộng mỗi cấp 22 bài. Trước đó hai phần này trộn lẫn; lượt đang dở của 240A-C, 220A, 220B, 219 theo bộ trộn cũ bị bỏ một lần, báo cáo đã xong vẫn giữ. 3 cấp Thông dụng gộp lại đủ 720 từ, 3 cấp Mở rộng đủ 659 từ, không trùng. Trong lúc kiểm tra, thứ tự hỏi từ vẫn xáo mỗi lần.

Từ bản 2.4.4 (anh Lộc chốt 2026-11-19) chia nhỏ thêm theo số từ anh đưa, vẫn đúng thứ tự từ trong file: 240A giữ nguyên bài, bỏ chữ A gọi là 240; 240B thành 119 + 121; 240C thành 118 + 122; 220A thành 111 + 109; 220B thành 112 + 108; 219 thành 113 + 106 (anh chọn để không trùng số với cấp khác). Mỗi bài có 10 từ nên có cấp bắt đầu hoặc kết thúc giữa bài (bài 90, 114, 138, 160, 182 chia cho hai cấp liền nhau). Cấp chia ra từ cùng một cấp cũ dùng chung màu. Lượt đang dở của 240B, 240C, 220A, 220B, 219 bị bỏ một lần; báo cáo đã hoàn thành của 5 cấp đó vẫn giữ, xem ở cuối Báo cáo tổng hợp (mục "Cấp cũ trước khi chia lại"). Tiến độ của 271, 273, 240A, 100 cụm, 96 câu giữ nguyên.

## 100 cụm từ giao tiếp (từ bản 2.2.0)

- Dữ liệu: `phrases.js`, sinh từ `tai-lieu/100 cụm từ tiếng Anh thông dụng.xlsx` trong vault bằng `tools/build_phrases.py`. Nghĩa tiếng Việt theo bản sếp duyệt (`raw/100cautienganh_moi_1.xlsx`).
- Trong app là một phần riêng nằm dưới 8 cấp, kiểm tra liền **1 lượt 100 cụm**, không chia bài. Cụm từ được nối vào cuối `WORDS` (chỉ số 1923-2022) nên tiến độ cũ không đổi.
- Nói (từ bản 2.4.0): tính theo số từ, không theo mục chọn giây: 1-2 từ 3 giây, 3-4 từ 5 giây, 5-6 từ 6 giây (Me too 3 giây, Try your best 5 giây, Don't be mad at me 6 giây). Cả lượt tối đa 7 phút 2 giây.
- Gõ phím: 1-2 phím 3 giây, mỗi phím thêm cộng 0,5 giây, làm tròn lên; đếm chữ cái + dấu cách + dấu ' (As soon as possible 12 giây). Cả lượt tối đa 15 phút 1 giây.
- Chấm khi nói: phải nghe ra đủ các từ, đúng thứ tự (nghe thừa tiếng ở đầu, cuối vẫn được). Viết tắt và viết đủ như nhau (I'm = I am), đồng âm như nhau (no/know). Không có "gần đúng".
- Chấm khi gõ: đúng hết từng chữ cái, bắt buộc gõ dấu ', không cần gõ ? ! . , và không phân biệt hoa/thường. Me too / Same here cùng nghĩa "Tôi cũng vậy" nên gõ cụm nào cũng tính đúng.

## 96 câu giao tiếp (từ bản 2.3.0)

- Dữ liệu: `cau96.js`, sinh từ `tai-lieu/96 câu tiếng Anh giao tiếp.xlsx` trong vault bằng `tools/build_cau96.py` (đọc bằng thư viện có sẵn của Python, không cần cài thêm). File có 3 bài (19 + 31 + 46 câu), chỉ có câu và nghĩa.
- Trong app là phần riêng nằm dưới 100 cụm từ, kiểm tra liền **1 lượt 96 câu**, không chia bài. Chỉ hiện câu và nghĩa, không có phiên âm, không có câu ví dụ (anh Lộc chốt 2026-11-11). Câu được nối vào cuối `WORDS` (chỉ số 2023-2118), tiến độ cũ không đổi.
- Sửa 3 chỗ chữ hiển thị so với file (anh Lộc duyệt): câu 32 thêm "?" (How old is your son?), câu 59 bỏ "?" (I don't know what it means), câu 60 viết hoa "Could". Cách chấm không đổi vì máy bỏ qua dấu câu và hoa/thường.
- Tính giờ và chấm giống hệt phần 100 cụm. Cả lượt tối đa: Nói 8 phút 28 giây, Gõ phím 19 phút 14 giây. 6 câu dài hơn 6 từ (7 và 9 từ, vd I have one older brother and one younger sister) tạm tính 7 giây khi nói; gõ câu dài nhất 26 giây.
- "No problem" có ở cả 100 cụm và 96 câu; hai phần tính tiến độ riêng.

## Cách kiểm tra

- Bấm vào cấp là vào kiểm tra luôn, một lượt hết cả cấp (thứ tự từ xáo mỗi lần).
- Hai chế độ, chọn ở Cài đặt (mục "Trả lời bằng"): **Nói** và **Gõ phím**. Mỗi chế độ có tiến độ, từ sai, báo cáo lần 1 và báo cáo tổng hợp riêng (`books.voice` và `books.type` trong localStorage). Đổi chế độ không mất tiến độ bên kia; bên chưa làm thì bắt đầu từ từ đầu.
- Nói: mỗi từ 3 giây, chỉnh được 1/2/2,5/3/4 giây trong Cài đặt (từ bản 2.4.0, bỏ 5 và 8 giây, máy đang chọn 5 hoặc 8 giây tự về 3 giây; bản 2.4.3 thêm 1 giây) (chỉ áp dụng cho chế độ Nói). Gõ phím: theo độ dài từ, từ 1-2 chữ cái (I, go) 3 giây, mỗi chữ cái thêm cộng 0,5 giây, làm tròn lên (cat 4 giây, family 5 giây, beautiful 7 giây, international 9 giây). Thời gian tối đa cả lượt = cộng thời gian từng từ. Gõ phải đúng hết từng chữ cái (sai 1 chữ là sai), chữ cái gõ sai được tô đỏ.
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
- Cách nghe mic (từ bản 2.3.1): 3 giây được đếm từ lúc mic thật sự thu tiếng; hết giờ thì máy chốt lại phần đã thu chứ không bỏ đi; máy tự ngắt giữa chừng thì mở lại mic, thử lại vài lần nếu điện thoại báo lỗi.
- Mic kẹt (từ bản 2.3.2): máy không mở được phiên nghe, bấm mà máy im, hoặc hết giờ máy không trả lời thì không tính sai. Lần đầu app tự mở lại mic cho nói lại từ đó (không đọc nghĩa lại), kẹt 2 lần liền thì hiện cách sửa với 2 nút Thử lại mic / Gõ phím. Cài đặt có **Nhật ký mic** (15 lần nghe gần nhất, trình duyệt, cách mở app) để chụp gửi khi máy nào bị.
- **Safari iPhone/iPad** nhận giọng còn chập chờn; Firefox không có. Khi đó app chuyển sang trả lời bằng **gõ phím**, máy vẫn tự chấm.
- Đọc tiếng Việt cần máy có giọng vi-VN (Android, Windows có sẵn "Microsoft An"; iPhone có sẵn).
- Tiến độ lưu trong `localStorage` của từng trình duyệt, không đồng bộ giữa các máy. Dùng Báo cáo → Xuất/Nhập dữ liệu để chuyển máy.
