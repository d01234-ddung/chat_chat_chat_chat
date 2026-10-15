# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

# Ball Vision

Ứng dụng web nhận diện bóng trong ảnh bằng COCO-SSD và TensorFlow.js. Toàn bộ suy luận chạy trong trình duyệt; ảnh không được tải lên máy chủ.

## Yêu cầu

- Node.js 20.19+ hoặc 22.12+ (npm đi kèm)
- Kết nối Internet ở lần chạy đầu để tải gói và trọng số mô hình AI

## Cài đặt và chạy

1. Cài các gói: `npm install`
2. Khởi chạy môi trường phát triển: `npm run dev`
3. Mở địa chỉ hiển thị trong terminal (thường là `http://localhost:5173`).

Tạo bản dựng production bằng `npm run build`; xem thử bản dựng với `npm run preview`.

## Cách sử dụng

Kéo thả ảnh vào vùng tải lên hoặc chọn tệp JPG, PNG, WEBP (tối đa 15 MB). Ảnh sẽ tự động được phân tích sau khi mô hình sẵn sàng. Khung màu xanh đánh dấu vật thể `sports ball`; bảng kết quả hiển thị điểm tin cậy cao nhất và cho phép chạy phân tích lại.

## Mô hình và giới hạn

Ứng dụng dùng mô hình COCO-SSD MobileNet v2 chạy bằng TensorFlow.js trong trình duyệt. Mô hình nhận diện lớp `sports ball` trong bộ nhãn COCO (ví dụ bóng đá, bóng rổ, bóng tennis), không phải mọi vật thể tròn hoặc mọi loại bóng. Ngưỡng phát hiện hiện là 5% để tăng khả năng giữ lại bóng nhỏ; ảnh bóng tennis nhỏ, ở xa, mờ hoặc bị che khuất vẫn có thể không được nhận ra. Điểm phần trăm là độ tin cậy của dự đoán mô hình, không phải xác suất đã được hiệu chuẩn hay bảo đảm chính xác. Khi không có phát hiện bóng, ứng dụng hiển thị “—” thay vì 0%, vì không có dự đoán không đồng nghĩa với độ tin cậy bằng 0%.

Mô hình và thư viện TensorFlow.js được tải từ các gói công khai ở lần chạy đầu; cần kết nối Internet để tải chúng. Ảnh người dùng vẫn được xử lý cục bộ trên thiết bị.
