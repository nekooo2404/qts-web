# QTS Public Enterprise Redesign

Ngày: 2026-08-14

## Mục tiêu

Nâng cấp toàn bộ `frontend-client` thành một website enterprise nổi bật, giàu tương tác và có ngôn ngữ riêng, đồng thời loại bỏ các dấu hiệu AI-template đã được audit. Thiết kế phải bám `frontend-client/DESIGN.md` và Creative North Star "The Operational Blueprint".

Phạm vi gồm sáu route public: `/`, `/nang-luc`, `/du-an`, `/giai-phap`, `/gioi-thieu`, `/lien-he`.

## Quyết định đã duyệt

- Chọn hướng tái cấu trúc có kiểm soát: tái sử dụng component Operational Blueprint đã có, không viết lại toàn bộ ứng dụng.
- Coi toàn bộ logo khách hàng, testimonial, chứng chỉ, lãnh đạo, mốc nhân sự và claim định lượng hiện tại là chưa được marketing/pháp lý duyệt.
- Không hiển thị tên khách hàng, testimonial, hồ sơ lãnh đạo stock-photo hoặc claim kinh doanh chưa có nguồn.
- Giữ các dự án ẩn danh. Mỗi dự án có thể hiển thị một số metric kỹ thuật đặc trưng, nhưng không có tên khách hàng, số liệu kinh doanh hoặc nhãn "minh họa".
- CTA duy nhất trong viewport đầu của landing page là "Xem năng lực", dẫn tới `/nang-luc`.
- Navbar dùng đầy đủ hành vi tham chiếu Cloudflare: mega menu, hover/click/keyboard, compact state theo scroll và mobile drawer accessible.
- Website phải nổi bật và thu hút, không được đơn giản tới mức nhạt; hiệu ứng phải củng cố nội dung và hierarchy thay vì trang trí vô nghĩa.

## Visual Direction

### Ngôn ngữ chính

Giao diện mang cảm giác "control room + operational blueprint": module vuông, đường chia 1px, section index, connector line, trạng thái hệ thống và bố cục bất đối xứng. Inter Variable tiếp tục là typeface duy nhất theo design contract.

Màu QTS navy tạo structural field; signal-blue là supporting field; warm-paper đánh dấu ưu tiên hoặc tương tác; trắng và paper là reading plane. Không dùng gradient trang trí, pill, rounded card, emoji icon, shadow scale rộng hoặc nhiều card bằng nhau.

### Độ nổi bật

- Hero landing dùng ảnh Trái Đất full-bleed, typography lớn, blueprint grid và data-line chuyển động nhẹ.
- Hai ảnh nền người dùng đã chọn được giữ lại như atmospheric layer có kiểm soát; chúng không thay thế linework và artifact kỹ thuật.
- Các section luân phiên navy, surface, signal-blue và warm-paper theo nhịp rõ ràng.
- Năng lực hiển thị như sơ đồ kiến trúc có node và connector thay vì feature-card grid.
- Dự án dùng gallery editorial với ảnh lớn, track bất đối xứng và metric strip.
- Giải pháp dùng disclosure "Vấn đề -> Kiến trúc -> Kết quả kỳ vọng".
- Kết thúc mỗi route bằng next-step liên quan ngữ cảnh, không dùng generic SaaS CTA/footer block.

## Information Architecture

### Landing page

1. Full-bleed hero với offer rõ và CTA "Xem năng lực".
2. Workflow đánh số: Khảo sát -> Blueprint -> Triển khai -> Vận hành.
3. Sơ đồ năng lực nhiều lớp.
4. Problem-to-solution disclosure preview.
5. Hồ sơ dự án ẩn danh được chọn lọc.
6. Closing statement và route tiếp theo.

Hero không chứa trust badge, client logo, testimonial, fake dashboard, floating notification hoặc số liệu proof chưa kiểm chứng.

### Năng lực

Trình bày các lớp kiến trúc, tích hợp, an toàn thông tin và vận hành dưới dạng system map. Bỏ logo/chứng chỉ chưa được duyệt. Technology tags chỉ mô tả stack và không được tạo click affordance giả.

### Dự án

Giữ dự án ẩn danh. Mỗi project record gồm:

- bối cảnh và phạm vi kỹ thuật;
- topology hoặc architecture layers;
- công nghệ chính;
- metric kỹ thuật đặc trưng như số hệ thống tích hợp, số lớp bảo vệ, số môi trường hoặc SLA mục tiêu;
- mô tả kết quả ở mức năng lực hệ thống, không nêu tiết kiệm, doanh thu, GMV hoặc mức hài lòng.

Metric phải được diễn đạt đúng bản chất. Ví dụ: "SLA mục tiêu 99.9%" thay vì "Đạt uptime 99.9%" khi không có nguồn xác minh.

### Giải pháp

Dùng disclosure có thể thao tác bằng chuột, touch và keyboard. Nội dung đi từ vấn đề vận hành tới kiến trúc xử lý và kết quả kỳ vọng; loại bỏ claim phần trăm chưa có nguồn.

### Giới thiệu

Bỏ leadership stock-photo, tên lãnh đạo, timeline nhân sự, Fortune 500, top-5 bank và government claim. Thay bằng nguyên tắc làm việc, trách nhiệm triển khai, operating model và cách các nhóm phối hợp.

### Liên hệ

Form giữ đúng contract hiện tại của API: `customerName`, `phone`, `email`, `message`. UI gom thành ba nhóm thông tin: người liên hệ, kênh liên hệ và bài toán. Không thêm budget hoặc service select ở bước đầu.

### Footer

Footer thu gọn thành brand, route hợp lệ và thông tin liên hệ có thật. Bỏ mọi `href="#"`, social/legal/service destination chưa tồn tại và label "Tuyển dụng" trỏ sai. Copyright dùng năm hiện tại.

## Navbar Cloudflare-style

### Desktop

- Navbar fixed nền navy, logo luôn giữ vị trí.
- Nhóm Năng lực, Giải pháp và Dự án mở mega menu qua hover, click hoặc focus.
- Mega menu có mô tả ngắn, route liên quan và preview kỹ thuật; không lặp một lưới card đều nhau.
- `Escape`, click ngoài và chuyển route đóng panel.
- Active route dùng `aria-current="page"`.
- Khi cuộn, cụm menu giữa translate/fade lên; CTA compact "Xem năng lực" xuất hiện bên phải. Cuộn về đầu trang khôi phục trạng thái đầy đủ.

### Mobile

- Menu button tối thiểu 44x44px.
- Drawer chỉ render khi mở, khóa scroll nền và đóng bằng `Escape`, backdrop hoặc chọn route.
- Focus chuyển vào drawer khi mở và trở lại menu button khi đóng.
- Menu con dùng disclosure/accordion; không có link vô hình trong Tab order.

## Motion System

- Hero copy hiển thị ngay; không delay thông tin chính.
- Blueprint grid và data-line chạy một entrance sequence ngắn.
- Ảnh hero có parallax nhẹ trên desktop; mobile giảm hoặc tắt parallax.
- Section reveal theo nhóm trong 400-550ms, không animate từng phần tử nhỏ độc lập.
- Connector line của system map chạy khi vào viewport; hover/focus làm sáng node liên quan.
- Project image dùng masked reveal; metric strip xuất hiện theo hàng.
- Mega menu dùng fade + translate ngắn, không bounce.
- Không có animation decorative loop liên tục.
- `prefers-reduced-motion: reduce` tắt parallax, reveal, smooth scroll và transition không thiết yếu.

## Component Architecture

- Route page là server component composition mỏng khi không cần local state.
- Nội dung và navigation config tập trung trong `src/data/site-content.ts` hoặc module dữ liệu liền kề, không lặp literal giữa các page.
- Client boundary chỉ dành cho navbar, project filtering/disclosure, motion observer và contact form.
- Tái sử dụng các component hiện có trong `src/components/home`, `projects`, `solutions`, `contact` và `shared` sau khi kiểm tra; không tạo một hệ component song song.
- Không thêm dependency animation. Dùng CSS, browser APIs, `next/image` và Phosphor Icons đang có.

## Accessibility And Interaction Rules

- Mọi control có hit area tối thiểu 44x44px.
- Functional text tối thiểu 12px, ưu tiên 14px.
- Tương phản đạt WCAG AA; placeholder không thay label.
- Global `focus-visible` rõ trên light/dark field.
- Heading theo thứ tự semantic; không nhảy cấp.
- Card không có pointer/hover nếu không có hành động.
- Hover content cũng phải truy cập được bằng focus/touch.
- Trạng thái mở/đóng, current route, form status và field errors có semantic/ARIA tương ứng.

## Form Data And Errors

- Form submit tới API hiện tại và giữ nguyên payload contract.
- `autocomplete` dùng cho name, tel và email.
- Validation theo field bằng tiếng Việt, liên kết qua `aria-describedby`.
- Phone/email/message tuân theo giới hạn backend; không giả thành công nếu API không cấu hình hoặc trả response không hợp lệ.
- Loading khóa submit; success/error dùng `aria-live` và giữ dữ liệu khi submit thất bại.
- Privacy copy chỉ mô tả luồng dữ liệu thực tế, không dùng lời hứa tuyệt đối khi chưa có policy được duyệt.

## Metadata And Content Hygiene

- Mỗi route có title và description riêng.
- Không còn tên khách hàng, client logo marquee, testimonial, certification badge hoặc leadership profile chưa được duyệt.
- Không còn footer year cố định hoặc dead destination.
- Vietnamese copy là ngôn ngữ chính; acronym kỹ thuật quan trọng được giải thích tại lần xuất hiện đầu tiên.

## Verification

Chạy tối thiểu:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Impeccable detector trên `frontend-client/src`
- Browser QA tại 1440x900, 390x844 và 320x800

Luồng browser bắt buộc:

1. Mỗi route tải được, có nội dung và metadata đúng.
2. Mega menu mở bằng hover, click và keyboard; đóng bằng Escape/click ngoài/chuyển route.
3. Navbar chuyển compact state khi scroll và phục hồi khi về đầu trang.
4. Mobile drawer quản lý focus và không để control ẩn trong Tab order.
5. Active route có visual state và `aria-current`.
6. Project filter/disclosure và solution disclosure thay đổi đúng nội dung.
7. Contact form kiểm tra empty, invalid, API unavailable, loading, success và failure state.
8. `prefers-reduced-motion` loại bỏ motion không thiết yếu.

Tiêu chí hoàn thành:

- Không console error hoặc framework overlay.
- Không blank route, broken image, horizontal overflow, overlap hoặc text clipping.
- Không dead `#` link hoặc faux affordance.
- Không touch target dưới 44px trong các control chính.
- Không low-contrast text đã được detector/browser xác nhận.
- Các finding P0/P1/P2 trong audit ban đầu được xóa hoặc có bằng chứng giải thích rõ.

## Ngoài phạm vi

- Không thay đổi backend contact contract hoặc persistence.
- Không tạo CMS/case-study authoring flow mới.
- Không phát minh tên khách hàng, logo, testimonial, lãnh đạo hoặc chứng chỉ.
- Không thêm social/legal route chưa có nội dung thật.
- Không refactor `frontend-portal` hoặc backend ngoài phần kiểm chứng read-only cần thiết.
