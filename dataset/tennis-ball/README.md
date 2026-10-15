# Bóng tennis — bộ dữ liệu pilot đã rà soát

Bộ này là một **pilot nhỏ có nhãn hộp**, không phải tập dữ liệu đủ lớn để bảo đảm mô hình dùng thực tế. Ảnh được chọn từ Wikimedia Commons; `manifest.json` lưu tiêu đề, trang nguồn, tác giả và giấy phép của từng ảnh. Giữ metadata và tuân thủ yêu cầu ghi công/chia sẻ tương tự của CC BY/CC BY-SA khi phân phối lại.

## Nội dung hiện tại

- 17 ảnh dương, có 25 hộp quanh bóng tennis.
- 21 ảnh âm đã rà soát: 13 biển báo dừng và 8 ảnh táo.
- 38 ảnh được chia theo lớp thành `train`, `val`, `test` trong thư mục `yolo/`.
- Nhãn YOLO: class `0 = tennis_ball`; ảnh âm có tệp nhãn rỗng.
- `annotations.csv` lưu tọa độ hộp pixel; `yolo/data.yaml` dùng trực tiếp với Ultralytics.
- `tmp/tennis-yolo-annotation-review.jpg` là contact sheet để kiểm tra trực quan các hộp.

## Tạo lại và xác minh

Từ thư mục gốc dự án:

1. `node scripts/collect-training-images.mjs` tải lại các ảnh được chọn và metadata nguồn.
2. `python scripts/prepare-tennis-training.py` tạo CSV có nhãn và cấu trúc YOLO.
3. `python scripts/validate-tennis-training.py` kiểm tra tệp/hộp và tạo contact sheet.

Các script Python cần Pillow: `pip install Pillow` trong Python environment đang dùng.

## Đánh giá chất lượng và giới hạn

Ảnh và nguồn đã được kiểm tra bằng contact sheets; hộp được ước lượng thủ công bằng quan sát ảnh, chưa được người gắn nhãn chuyên nghiệp nghiệm thu. Hãy kiểm tra/sửa từng hộp trong CVAT hoặc Label Studio trước khi coi nhãn là ground truth. Có một số ảnh chụp bóng rất rõ, một số cảnh có bóng nhỏ hoặc bị che một phần; ảnh xanh dương là bóng tập luyện, còn bóng padel/cricket và ảnh xanh nhiều bóng cần xác nhận phù hợp nhãn tennis-ball.

**Chưa đủ để huấn luyện đáng tin cậy:** 25 đối tượng và 5 ảnh test quá ít, nguồn ảnh Commons không đại diện đầy đủ cho ảnh người dùng. Cần thêm hàng trăm đến hàng nghìn ảnh được cấp quyền sử dụng, đa dạng góc nhìn/kích thước/ánh sáng/nền/che khuất và ảnh âm khó; tăng test độc lập theo nguồn/cảnh.

## Kết quả huấn luyện pilot

Đã chạy YOLOv8n transfer learning trên CPU; Ultralytics dừng sớm sau 10 epoch (giới hạn đặt 25, patience 8). Trọng số là `yolo/runs/tennis-ball-pilot/weights/best.pt`; báo cáo metric nằm ở `yolo/training-summary.json`, log ở `yolo/runs/tennis-ball-pilot/results.csv`.

Trên tập test chỉ có 5 ảnh và 2 bóng gắn nhãn, precision đo được khoảng 9,6%, recall 100%, mAP@0.5 99,5%. Precision thấp nghĩa là phần lớn dự đoán có thể là false positive; mAP cao không đáng tin khi test quá nhỏ. Contact sheet dự đoán xác nhận model còn tạo nhiều khung sai. Mô hình này chỉ chứng minh pipeline train chạy được, **không nên dùng trong ứng dụng hoặc xem là model đã nhận diện tốt**.

Lệnh chạy lại: `python scripts/train-tennis-model.py`. Cần bổ sung và kiểm duyệt nhãn/hình ảnh, nhất là các ảnh tennis rộng và các tình huống không có bóng, rồi mới train/đánh giá lại.
