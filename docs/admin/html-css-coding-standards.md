
# PHẦN BỔ SUNG — PAWPAL ADMIN HTML/CSS CODING STANDARDS

Áp dụng cho toàn bộ quá trình chuẩn hóa các phân hệ Admin còn lại theo giao diện Khách hàng đã hoàn thiện.

## A. Quy tắc kiến trúc

- Phải kiểm tra cấu trúc HTML/CSS/JavaScript hiện tại trước khi sửa.
- Giữ kiến trúc module hiện có của PawPal, không tự ý chuyển framework.
- Ưu tiên tái sử dụng component và CSS đang hoạt động tốt ở Khách hàng.
- Xây dựng quy chuẩn chung cho bảng, bộ lọc, nút, modal, hồ sơ, tab và trạng thái.
- CSS riêng từng phân hệ chỉ được định nghĩa những thành phần thực sự khác biệt về nghiệp vụ.
- Không sao chép nguyên `customers.css` sang `pets.css` hoặc các phân hệ khác.
- Không sửa giao diện Khách hàng đã chốt nếu không có lý do kỹ thuật rõ ràng.

## B. Quy định HTML

### B1. Cấu trúc

1. Dùng HTML có ngữ nghĩa phù hợp: `main`, `section`, `nav`, `form`, `table`, `thead`, `tbody`, `button`.
2. Bảng dữ liệu phải sử dụng cấu trúc bảng phù hợp, không tạo bảng bằng nhiều `div` khi không có lý do kỹ thuật.
3. Thao tác bấm dùng `button` hoặc liên kết đúng mục đích.
4. Mỗi ô nhập phải có label và thông báo lỗi được liên kết phù hợp.
5. Không tạo nhiều ID giống nhau trong một trang.
6. Giữ các ID, class và `data-*` đang được JavaScript dùng để gắn sự kiện, trừ khi đã cập nhật đầy đủ các nơi tham chiếu.
7. Không xóa trường thông tin hoặc chức năng nghiệp vụ chỉ vì không xuất hiện trong prototype.
8. HTML sinh động bằng JavaScript cũng phải tuân thủ cùng quy chuẩn.

### B2. Ví dụ cấu trúc bảng

```html
<div class="admin-table-container">
  <table class="admin-table">
    <thead>
      <tr>
        <th scope="col">Mã</th>
        <th scope="col">Tên</th>
        <th scope="col">Trạng thái</th>
        <th scope="col">Thao tác</th>
      </tr>
    </thead>

    <tbody>
      <tr>
        <td class="admin-table__code">PET-001</td>
        <td class="admin-table__primary">Bé Lu</td>
        <td>
          <span class="admin-status admin-status--active">
            Đang hoạt động
          </span>
        </td>
        <td>
          <button type="button" class="admin-btn admin-btn--text">
            Xem hồ sơ
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

Đây là cấu trúc tham khảo. Trước khi áp dụng phải đối chiếu và ưu tiên tái sử dụng class chuẩn đã có trong phân hệ Khách hàng.

## C. Quy định CSS

### C1. Design tokens

Dùng biến CSS tập trung cho:
- Màu thương hiệu.
- Màu chữ và đường phân cách.
- Font, kích thước chữ.
- Khoảng cách.
- Chiều cao input và button.
- Border radius.
- Chiều rộng modal.
- Kích thước bảng và drawer.

Không tự phát sinh giá trị khác nhau ở từng phân hệ nếu cùng một component.

### C2. Quy tắc đặt class

Ưu tiên tên class phản ánh component và vai trò:

- `admin-table`
- `admin-table__primary`
- `admin-table__secondary`
- `admin-table__code`
- `admin-filter`
- `admin-btn`
- `admin-modal`
- `admin-modal__footer`
- `admin-profile`
- `admin-profile__field`
- `admin-status`

Có thể dùng modifier như `--compact`, `--danger`, `--active`.

Không bắt buộc đổi toàn bộ class cũ ngay lập tức. Chỉ chuẩn hóa khi đã kiểm tra ảnh hưởng tới JavaScript và CSS hiện tại.

### C3. CSS bắt buộc

- Không dùng `!important` tràn lan.
- Không dùng inline style để định dạng UI tĩnh.
- Không dùng selector quá dài hoặc phụ thuộc sâu vào cấu trúc DOM.
- Không dùng CSS global có thể vô tình ảnh hưởng phân hệ khác.
- Không đặt lại toàn bộ font, button, input và table trong từng file CSS riêng.
- Không lặp nhiều lần cùng một khai báo để vá lỗi hiển thị.
- Không dùng badge nền màu bo tròn cho trạng thái.
- Không dùng icon ngoài sidebar theo quy chuẩn đã chốt.
- Không tạo card trắng, shadow hoặc viền nhấn một bên chỉ để trang trí.

### C4. Tổ chức CSS

Phân biệt rõ:

**Global/Admin shared**
- Design tokens.
- Typography.
- Button.
- Table.
- Filter.
- Form.
- Modal/Drawer.
- Tabs.
- Status.
- Empty/Loading/Error.

**Module-specific**
- Bố cục đặc thù.
- Thành phần dữ liệu riêng.
- Các tương tác nghiệp vụ riêng của phân hệ.

Không thay đổi cấu trúc thư mục trước khi xác minh kiến trúc hiện tại.

## D. Quy định component bảng

Tất cả bảng Admin phải đồng nhất về:

- Kích thước font.
- Padding ô.
- Chiều cao dòng và chế độ bảng gọn.
- Màu đường phân cách.
- Hover/focus.
- Header cố định nếu phù hợp.
- Hiển thị dữ liệu dài.
- Căn lề số liệu.
- Trạng thái dạng chữ.
- Menu thao tác.
- Loading, Empty và Error.

Cột nghiệp vụ của từng phân hệ được phép khác nhau.

Không được cố ép một bảng có nhiều cột vào cùng độ rộng như bảng Khách hàng. Phải có phương án cuộn ngang có kiểm soát.

## E. Quy định modal và hồ sơ

### Modal
- Có cấu trúc header, body và footer nhất quán.
- Nút lưu/hủy/xác nhận theo một trật tự thống nhất.
- Có validation và lỗi theo từng trường.
- Có trạng thái đang xử lý để tránh gửi trùng.
- Hỗ trợ Esc, focus và thao tác bàn phím phù hợp.

### Hồ sơ
- Thống nhất typography, tab, hàng nhãn–giá trị và nút thao tác.
- Giữ dữ liệu nghiệp vụ riêng của từng hồ sơ.
- Không tạo nhiều card trang trí thay cho nhóm thông tin.
- Không tạo avatar chữ cái hoặc icon trang trí.
- Không giả lập lịch sử hay dữ liệu chưa có.

## F. Quy định JavaScript và HTML render động

1. Kiểm tra HTML template/string được sinh trong JavaScript.
2. Những thành phần cùng loại phải sử dụng class CSS chuẩn.
3. Không tự tạo class mới chỉ vì chuyển sang phân hệ khác.
4. Không đưa dữ liệu người dùng chưa được xử lý an toàn trực tiếp vào `innerHTML`.
5. Không thay thế event handler nghiệp vụ hiện có bằng handler demo.
6. Không làm mất nút, modal, quyền truy cập hoặc thao tác CRUD.
7. Không thay đổi API, Supabase, Realtime hoặc schema khi chỉ sửa giao diện.
8. Không thêm truy vấn database chỉ để phục vụ trang trí hoặc thống kê không cần thiết.

## G. Kiểm tra chất lượng code

Sau khi sửa mỗi phân hệ:

- [ ] HTML hợp lệ, không trùng ID.
- [ ] JavaScript không báo lỗi cú pháp.
- [ ] Không có CSS class thừa do quá trình chuyển đổi.
- [ ] Không có các CSS override trùng lặp.
- [ ] Bảng giống chuẩn Khách hàng về hệ thiết kế.
- [ ] Các ô trạng thái, số liệu và thông tin phụ thống nhất.
- [ ] Modal và form thống nhất.
- [ ] Hồ sơ và các tab thống nhất.
- [ ] Không mất chức năng nghiệp vụ.
- [ ] Tìm kiếm, lọc, phân trang, CRUD hoạt động.
- [ ] Không phát sinh request Supabase thừa.
- [ ] Không ảnh hưởng tới Khách hàng đã hoàn thiện.
- [ ] Kiểm tra cùng viewport 1280px, 1440px và 1680px.

## H. Quy trình thực hiện bắt buộc

1. Đọc component chuẩn đang triển khai trong Khách hàng.
2. Trích xuất quy chuẩn HTML/CSS thực tế.
3. Kiểm tra các component tương ứng ở phân hệ cần sửa.
4. Lập bảng mapping component và CSS class.
5. Thực hiện thay đổi có phạm vi nhỏ.
6. Kiểm tra render và nghiệp vụ.
7. So sánh với phân hệ Khách hàng.
8. Chỉ chuyển phân hệ tiếp theo khi không còn khác biệt UI không có lý do nghiệp vụ.

**Không được báo hoàn thành nếu mới chỉ đồng bộ màu sắc, font hoặc bố cục trang mà chưa chuẩn hóa các thành phần chi tiết.**