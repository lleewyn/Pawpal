# Quản lý hình ảnh với MongoDB

> Tài liệu thực hành · Business Web Development – Phần 2

> Chuyển đổi từ PDF sang Markdown. Nội dung văn bản, lệnh và bố cục bảng được giữ ở mức có thể trích xuất; hình ảnh/sơ đồ trong PDF không được nhúng vào bản Markdown.

    TÀI LIỆU THỰC HÀNH · BUSINESS WEB DEVELOPMENT – PHẦN 2


    Quản lý hình ảnh
    với MongoDB
    Upload ảnh với Node.js, Express, Multer – hai tình huống triển khai thực tế: lưu
    đường dẫn trên server và lưu trực tiếp trong MongoDB (BinData, GridFS)


TÌNH HUỐNG 1      Ảnh lưu trên ổ đĩa server (hoặc cloud storage) – MongoDB lưu đường dẫn và
                  thông tin ảnh

TÌNH HUỐNG 2      Ảnh lưu trực tiếp trong MongoDB: 2a – BinData trong document · 2b – GridFS

DỰ ÁN DEMO        image-upload-demo: Express 5 · Multer 2 · MongoDB Node.js Driver 7 · bộ dữ
                  liệu shopdb

NỘI DUNG          7 bài · 25 lệnh curl/mongosh kèm kết quả chạy · 7 bài tập thực hành

---

Mục lục
Bài 1. Bài toán quản lý hình ảnh trong ứng dụng web ........................................................................... 3
     1.1. Mục tiêu ..........................................................................................................................................................3
     1.2. Hai chiến lược lưu trữ hình ảnh ......................................................................................................................3
     1.3. Upload file hoạt động như thế nào? ...............................................................................................................4

Bài 2. Chuẩn bị dự án demo.................................................................................................................. 5
     2.1. Yêu cầu ............................................................................................................................................................5
     2.2. Cấu trúc thư mục ............................................................................................................................................5
     2.3. Cài đặt và chạy ................................................................................................................................................5
     2.4. Kết nối MongoDB – db.js .................................................................................................................................6
     2.5. Cấu hình Multer dùng chung – middlewares/upload.js ..................................................................................7
     2.6. Khởi tạo ứng dụng – server.js .........................................................................................................................8
     2.7. Kiểm thử API bằng curl hoặc Postman ............................................................................................................9

Bài 3. Tình huống 1 – Upload ảnh lên server, lưu đường dẫn vào MongoDB ....................................... 10
     3.1. Thiết kế dữ liệu .............................................................................................................................................10
     3.2. Bước 1 – Kiểm tra sản phẩm trước khi nhận file...........................................................................................10
     3.3. Bước 2 – Nhận file và lưu đường dẫn vào MongoDB....................................................................................11
     3.4. Bước 3 – Phục vụ ảnh như file tĩnh ...............................................................................................................12
     3.5. Bước 4 – Đọc danh sách ảnh và xoá ảnh .......................................................................................................12
     3.6. Chạy thử Tình huống 1 ..................................................................................................................................13
     3.7. Upload và hiển thị ảnh trên trang web .........................................................................................................15
     3.8. Truy vấn trên dữ liệu ảnh ..............................................................................................................................16
     3.9. Khi triển khai ứng dụng thật .........................................................................................................................17

Bài 4. Tình huống 2 – Lưu ảnh trực tiếp trong MongoDB .................................................................... 18
     4.1. Hai cách lưu dữ liệu nhị phân........................................................................................................................18
     4.2. Cách 2a – Avatar khách hàng dạng BinData ..................................................................................................18
     4.3. Cách 2b – Ảnh sản phẩm bằng GridFS ...........................................................................................................21
     4.4. Những điều cần lưu ý khi lưu ảnh trong MongoDB ......................................................................................26

Bài 5. So sánh và lựa chọn giải pháp ................................................................................................... 27
     5.1. Bảng so sánh .................................................................................................................................................27
     5.2. Khuyến nghị...................................................................................................................................................27

Bài 6. Bảo mật và lỗi thường gặp........................................................................................................ 28
     6.1. Danh sách kiểm tra bảo mật khi cho phép upload ........................................................................................28
     6.2. Lỗi thường gặp ..............................................................................................................................................28

Bài 7. Bài tập thực hành ..................................................................................................................... 29

---

Bài 1. Quản lý hình ảnh trong ứng dụng web

1.1. Mục tiêu
Hầu hết ứng dụng web kinh doanh đều phải xử lý hình ảnh: ảnh sản phẩm, ảnh đại diện khách hàng, hoá
đơn chụp lại, banner khuyến mãi… Tài liệu này hướng dẫn người học xây dựng chức năng upload hình ảnh
với Node.js/Express và MongoDB theo hai tình huống thường gặp khi triển khai thực tế:
 • Tình huống 1: Lưu file trên server, MongoDB lưu đường dẫn. File ảnh nằm trong một thư mục của
   server (hoặc dịch vụ lưu trữ đám mây). Document trong MongoDB chỉ chứa đường dẫn (URL) và thông
   tin mô tả ảnh.
 • Tình huống 2: Lưu ảnh trực tiếp trong MongoDB. Nội dung nhị phân của ảnh được ghi vào database,
   theo hai cách: 2a – BinData (ảnh nhỏ nằm ngay trong document) và 2b – GridFS (cơ chế chia nhỏ file
   của MongoDB, dùng cho file lớn).

Sau khi hoàn thành, người học có thể:
 • Giải thích cách trình duyệt gửi file lên server (multipart/form-data) và vai trò của thư viện Multer.
 • Cài đặt API upload, xem, xoá ảnh cho cả hai tình huống; kiểm tra định dạng, dung lượng, số lượng
   file.
 • Thiết kế dữ liệu ảnh trong MongoDB và viết truy vấn trên dữ liệu đó.
 • So sánh ưu nhược điểm để chọn giải pháp phù hợp khi triển khai ứng dụng thật.

  Lưu ý: Tài liệu dùng bộ dữ liệu shopdb (TechZone) của tài liệu Guide-Mongo. Mọi câu lệnh curl, mongosh
  và các khối Kết quả đều được chạy thật trên dự án demo đi kèm (image-upload-demo) với MongoDB 8.0,
  Express 5, Multer 2 và MongoDB Node.js Driver 7.


1.2. Hai chiến lược lưu trữ hình ảnh


                               Hình 1. Hai chiến lược lưu trữ hình ảnh được minh hoạ trong tài liệu

Khác biệt cốt lõi nằm ở chỗ nội dung file ảnh được lưu ở đâu:

---

                               Tình huống 1 – Lưu đường dẫn                  Tình huống 2 – Lưu trong MongoDB
 Nội dung ảnh nằm ở            Ổ đĩa server / dịch vụ lưu trữ đám mây        Database MongoDB
                               URL + thông tin mô tả (tên, kích thước,
 MongoDB lưu                                                                 Toàn bộ dữ liệu nhị phân + thông tin mô tả
                               loại…)
                                                                             Qua một API của ứng dụng (đọc từ DB rồi
 Trình duyệt tải ảnh           Trực tiếp từ web server/CDN dạng file tĩnh
                                                                             trả về)
 Multer lưu tạm file ở         Ổ đĩa (diskStorage)                           Bộ nhớ RAM (memoryStorage)
                                                                             2a: avatar – customers.avatar; 2b: ảnh sản
 Ví dụ trong demo              Ảnh sản phẩm – products.images
                                                                             phẩm – GridFS productImages


1.3. Upload file hoạt động như thế nào?
Khi gửi form có file, trình duyệt không dùng JSON mà dùng định dạng multipart/form-data: phần thân
yêu cầu (request body) được chia thành nhiều phần, mỗi phần là một trường của form. Phần chứa file
có thêm tên file gốc và kiểu nội dung (Content-Type).
HTTP REQUEST

  POST /api/products/P009/images HTTP/1.1
  Content-Type: multipart/form-data; boundary=----X9f3

  ------X9f3
  Content-Disposition: form-data; name="images"; filename="laptop.jpg"
  Content-Type: image/jpeg

  <dữ liệu nhị phân của ảnh…>
  ------X9f3--


Express không tự đọc được kiểu dữ liệu này (express.json() chỉ xử lý JSON). Ta dùng Multer –
middleware chuyên xử lý multipart/form-data. Sau khi Multer chạy, thông tin file nằm trong
req.file (một file) hoặc req.files (nhiều file):

 Thuộc tính                    Ý nghĩa
 fieldname                     Tên trường trong form (ví dụ images) – phải khớp với tên khai báo ở server
 originalname                  Tên file trên máy người dùng (không nên dùng làm tên lưu trên server)
 mimetype                      Kiểu nội dung do trình duyệt gửi lên, ví dụ image/jpeg
 size                          Kích thước file (byte)
 destination,
                               Chỉ có với diskStorage: thư mục, tên file đã lưu, đường dẫn đầy đủ
 filename, path

 buffer                        Chỉ có với memoryStorage: toàn bộ nội dung file dạng Buffer trong RAM

Ba cách khai báo hay dùng:

 Middleware                                     Dùng khi
 upload.single("avatar")                        Form có một file, trường tên avatar → req.file
 upload.array("images", 5)                      Nhiều file cùng tên trường images, tối đa 5 → req.files (mảng)
 upload.fields([{ name: "front" },
                                                Nhiều trường file khác nhau → req.files.front, req.files.back
 { name: "back" }])

---

Bài 2. Chuẩn bị dự án demo

2.1. Yêu cầu
 • Node.js 18 trở lên (kiểm tra bằng node -v).
 • MongoDB đang chạy và đã import bộ dữ liệu shopdb (xem Bài 2 của tài liệu Guide-Mongo).
 • Thư mục dự án image-upload-demo (được phát kèm tài liệu này).


2.2. Cấu trúc thư mục
  image-upload-demo/
  ├── server.js                  Khởi tạo Express, gắn các route
  ├── db.js                      Kết nối MongoDB dùng chung
  ├── middlewares/
  │   └── upload.js              Cấu hình Multer: bộ lọc ảnh, diskStorage, memoryStorage
  ├── routes/
  │   ├── products-disk.js       Tình huống 1 – ảnh trên ổ đĩa, lưu đường dẫn
  │   ├── customers-avatar.js    Tình huống 2a – avatar BinData trong document
  │   └── products-gridfs.js     Tình huống 2b – ảnh sản phẩm trong GridFS
  ├── public/index.html          Giao diện demo (HTML + JavaScript thuần)
  ├── uploads/products/          Nơi lưu ảnh của Tình huống 1 (tự tạo khi chạy)
  ├── sample-images/             Ảnh mẫu để thử (có cả ảnh ~3 MB và file .txt để thử lỗi)
  └── package.json


2.3. Cài đặt và chạy
TERMINAL / COMMAND PROMPT

  cd image-upload-demo
  npm install
  npm start

Màn hình Terminal hiển thị:
KẾT QUẢ

  Đã kết nối MongoDB: mongodb://localhost:27017 / shopdb
  Demo chạy tại http://localhost:3000


Mở trình duyệt tại http://localhost:3000 để dùng giao diện demo. Muốn kết nối MongoDB Atlas,
đặt biến môi trường MONGODB_URI trước khi chạy, ví dụ trên Windows PowerShell:
$env:MONGODB_URI="mongodb+srv://..."; npm start.

---

                               Hình 2. Giao diện demo – ba khung tương ứng ba cách lưu ảnh


  Mẹo: Dùng npm run dev thay cho npm start để server tự khởi động lại mỗi khi sửa mã nguồn (tính năng
  node --watch của Node.js).


2.4. Kết nối MongoDB – db.js
DB.JS

  // Kết nối MongoDB dùng chung cho toàn bộ ứng dụng
  const { MongoClient } = require("mongodb");

  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  const dbName = process.env.DB_NAME || "shopdb";
  const client = new MongoClient(uri);
  let db;

  async function connect() {
    await client.connect();
    db = client.db(dbName);
    // Index giúp tìm nhanh các ảnh GridFS của một sản phẩm (Tình huống 2b)
    await db.collection("productImages.files").createIndex({ "metadata.productId": 1 });
    console.log(`Đã kết nối MongoDB: ${uri} / ${dbName}`);
    return db;
  }

  function getDb() {
    if (!db) throw new Error("Chưa kết nối MongoDB – hãy gọi connect() trước");
    return db;
  }

  module.exports = { connect, getDb, client };

connect() được gọi một lần khi khởi động; các route dùng getDb() để lấy đối tượng database. Index
trên metadata.productId phục vụ Tình huống 2b.

---

2.5. Cấu hình Multer dùng chung – middlewares/upload.js
Bộ lọc định dạng ảnh. fileFilter được Multer gọi cho từng file trước khi lưu: gọi cb(null, true) để
nhận, truyền một Error để từ chối.
MIDDLEWARES/UPLOAD.JS (TRÍCH)

  // Thư mục lưu ảnh sản phẩm trên server (Tình huống 1)
  const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "products");
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  // Chỉ chấp nhận các định dạng ảnh phổ biến (giá trị = đuôi file dùng khi lưu)
  const ALLOWED_TYPES = {
     "image/jpeg": ".jpg",
     "image/png": ".png",
     "image/webp": ".webp",
     "image/gif": ".gif"
  };

  function imageFilter(req, file, cb) {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
    const err = new Error(
       `Định dạng ${file.mimetype} không được hỗ trợ (chỉ nhận JPG, PNG, WEBP, GIF)`
    );
    err.status = 400;
    cb(err);
  }

Lưu xuống ổ đĩa (Tình huống 1). diskStorage cho phép tự quyết định thư mục (destination) và tên file
(filename). limits chặn file quá lớn và số file quá nhiều ngay khi đang nhận dữ liệu.
MIDDLEWARES/UPLOAD.JS (TRÍCH)

  // Tình huống 1 – ghi file xuống ổ đĩa của server
  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      // Tự đặt tên file: <mã SP>-<thời điểm>-<chuỗi ngẫu nhiên>.<đuôi>
      // => không trùng tên, không dùng tên gốc của người dùng (tránh ký tự lạ, ../)
      const random = crypto.randomBytes(4).toString("hex");
      cb(
         null,
         `${req.params.id}-${Date.now()}-${random}${ALLOWED_TYPES[file.mimetype]}`
      );
    }
  });

  const uploadToDisk = multer({
    storage: diskStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 2 * 1024 * 1024, files: 5 } // tối đa 2 MB/ảnh, 5 ảnh/lần
  });

Lưu trong RAM (Tình huống 2). memoryStorage không ghi gì xuống ổ đĩa; nội dung file nằm trong
req.file.buffer để ta ghi tiếp vào MongoDB. Hàm nhận tham số dung lượng tối đa vì avatar và ảnh sản
phẩm có giới hạn khác nhau.

---

MIDDLEWARES/UPLOAD.JS (TRÍCH)

  // Tình huống 2 – giữ file trong RAM (req.file.buffer) để ghi thẳng vào MongoDB
  const uploadToMemory = maxBytes =>
    multer({
      storage: multer.memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: maxBytes, files: 5 }
    });

Xử lý lỗi upload. Multer báo lỗi bằng MulterError với mã lỗi (code). Middleware dưới đây chuyển chúng
thành phản hồi 400 dạng JSON:
MIDDLEWARES/UPLOAD.JS (TRÍCH)

  // Chuyển lỗi upload thành phản hồi JSON dễ hiểu (đặt SAU các route trong server.js)
  function uploadErrorHandler(err, req, res, next) {
    if (err instanceof multer.MulterError) {
      const messages = {
         LIMIT_FILE_SIZE: "Ảnh vượt quá dung lượng cho phép",
         LIMIT_FILE_COUNT: "Vượt quá số ảnh được phép trong một lần upload",
         LIMIT_UNEXPECTED_FILE: `Tên trường file không đúng: "${err.field}"`
      };
      return res
         .status(400)
         .json({ error: messages[err.code] || err.message, code: err.code });
    }
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }


2.6. Khởi tạo ứng dụng – server.js
SERVER.JS

  // Ứng dụng demo: 2 tình huống quản lý hình ảnh với MongoDB (bộ dữ liệu shopdb)
  const express = require("express");
  const path = require("path");
  const { connect } = require("./db");
  const { uploadErrorHandler } = require("./middlewares/upload");

  const app = express();
  app.use(express.json());

  // Giao diện demo (public/index.html)
  app.use(express.static(path.join(__dirname, "public")));

  // Tình huống 1: phục vụ ảnh đã upload như file tĩnh
  // → http://localhost:3000/uploads/products/<tên-file>
  app.use(
     "/uploads",
     express.static(path.join(__dirname, "uploads"), { maxAge: "7d" })
  );

  app.use("/api/products", require("./routes/products-disk")); // Tình huống 1
  app.use("/api/customers", require("./routes/customers-avatar")); // Tình huống 2a
  app.use("/api/gridfs", require("./routes/products-gridfs")); // Tình huống 2b

  // Xử lý lỗi: lỗi upload → 400, lỗi khác → 500
  app.use(uploadErrorHandler);
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Lỗi máy chủ" });
  });

---

  const PORT = process.env.PORT || 3000;
  connect()
    .then(() =>
      app.listen(PORT, () => console.log(`Demo chạy tại http://localhost:${PORT}`))
    )
    .catch(err => {
      console.error("Không kết nối được MongoDB:", err.message);
      process.exit(1);
    });


  Cảnh báo: Middleware xử lý lỗi (4 tham số err, req, res, next) phải được khai báo sau các route. Nếu
  đặt trước, lỗi của Multer sẽ không được bắt và người dùng nhận trang lỗi HTML mặc định.


2.7. Kiểm thử API bằng curl hoặc Postman
Ngoài giao diện web, ta kiểm thử API bằng curl – có sẵn trên macOS, Linux và Windows 10/11. Tham số
-F tạo một trường multipart/form-data, ký tự @ nghĩa là "đọc nội dung từ file":
TERMINAL / COMMAND PROMPT

  curl -X POST http://localhost:3000/api/products/P009/images -F "images=@sample-
  images/laptop.jpg"


  Lưu ý: Trên Windows PowerShell, curl là bí danh của lệnh khác – hãy gõ curl.exe (hoặc dùng Command
  Prompt). Các lệnh trong tài liệu chạy tại thư mục image-upload-demo. Với Postman: chọn Body → form-
  data, đặt kiểu trường là File, tên trường đúng như API yêu cầu (images hoặc avatar).

---

Bài 3. Tình huống 1 – Upload ảnh lên server, lưu đường dẫn
vào MongoDB

3.1. Thiết kế dữ liệu
Mỗi sản phẩm có thể có nhiều ảnh, vì vậy ta thêm vào document products một mảng tài liệu con
images. Mỗi phần tử không chứa ảnh mà chứa thông tin về ảnh:
JSON

  {
       "_id": "P009",
       "name": "MacBook Air M3 13 inch",
       "images": [
         {
           "url": "/uploads/products/P009-1793959526660-5de3f618.jpg",
           "filename": "P009-1793959526660-5de3f618.jpg",
           "originalName": "laptop.jpg",
           "contentType": "image/jpeg",
           "size": 19945,
           "uploadedAt": { "$date": "2026-11-06T10:05:26.665Z" }
         }
       ]
  }

 • url – đường dẫn để đặt vào thẻ <img src="...">.
 • filename – tên file thật trên ổ đĩa, dùng khi xoá ảnh.
 • originalName, contentType, size, uploadedAt – thông tin để quản lý, thống kê.

  Mẹo: Nhúng (embed) ảnh vào sản phẩm phù hợp vì ảnh luôn được đọc cùng sản phẩm và số lượng ít
  (demo giới hạn 8 ảnh). Nếu một đối tượng có hàng nghìn ảnh (ví dụ thư viện ảnh người dùng), hãy tách
  thành collection riêng có trường productId.


3.2. Bước 1 – Kiểm tra sản phẩm trước khi nhận file
Multer ghi file xuống ổ đĩa ngay khi nhận dữ liệu. Vì vậy ta đặt một middleware kiểm tra trước Multer:
nếu sản phẩm không tồn tại hoặc đã đủ ảnh, yêu cầu bị từ chối và không có file rác nào được ghi.
ROUTES/PRODUCTS-DISK.JS (TRÍCH)

  // Middleware: kiểm tra sản phẩm tồn tại, còn chỗ chứa ảnh – TRƯỚC khi Multer ghi file
  async function ensureProduct(req, res, next) {
    const p = await products().findOne(
       { _id: req.params.id },
       { projection: { images: 1 } }
    );
    if (!p) return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
    if ((p.images?.length ?? 0) >= MAX_IMAGES) {
       return res.status(400).json({ error: `Sản phẩm đã có đủ ${MAX_IMAGES} ảnh` });
    }
    next();
  }

---

3.3. Bước 2 – Nhận file và lưu đường dẫn vào MongoDB
ROUTES/PRODUCTS-DISK.JS (TRÍCH)

  // POST /api/products/:id/images – form-data, trường "images" (1–5 file)
  router.post(
    "/:id/images",
    ensureProduct,
    uploadToDisk.array("images", 5),
    async (req, res) => {
      if (!req.files?.length)
        return res.status(400).json({ error: "Chưa chọn ảnh nào" });

           // Mỗi ảnh là một tài liệu con: URL để hiển thị + thông tin để quản lý
           const images = req.files.map(f => ({
             url: `/uploads/products/${f.filename}`,
             filename: f.filename,
             originalName: f.originalname,
             contentType: f.mimetype,
             size: f.size,
             uploadedAt: new Date()
           }));

           let result;
           try {
             result = await products().updateOne(
                {
                   _id: req.params.id,
                   // Chỉ cập nhật nếu tổng số ảnh sau khi thêm không vượt MAX_IMAGES
                   // (kiểm tra và ghi trong CÙNG một thao tác → an toàn khi upload đồng thời)
                   $expr: {
                     $lte: [
                       { $add: [{ $size: { $ifNull: ["$images", []] } }, images.length] },
                       MAX_IMAGES
                     ]
                   }
                },
                { $push: { images: { $each: images } } }
             );
           } catch (err) {
             // Ghi DB lỗi → xoá file vừa lưu, tránh file "mồ côi"
             await removeFiles(req.files);
             throw err;
           }
           if (result.matchedCount === 0) {
             await removeFiles(req.files);
             return res
                .status(400)
                .json({ error: `Mỗi sản phẩm tối đa ${MAX_IMAGES} ảnh` });
           }
           res.status(201).json({ added: images.length, images });
       }
  );

  function removeFiles(files) {
    return Promise.all(files.map(f => fs.unlink(f.path).catch(() => {})));
  }

Những điểm cần chú ý:
 • Thứ tự middleware: ensureProduct → uploadToDisk.array("images", 5) → hàm xử lý. Khi vào
   hàm xử lý, các file đã nằm trên ổ đĩa, req.files chứa thông tin của chúng.
 • $push kết hợp $each thêm nhiều phần tử vào mảng trong một lệnh.

---

 • Điều kiện $expr trong filter kiểm tra "số ảnh hiện có + số ảnh mới ≤ 8" ngay trong lệnh cập nhật.
   Nếu hai người cùng upload một lúc, MongoDB vẫn bảo đảm không vượt giới hạn – một ứng dụng
   thực tế của $expr đã học ở Guide-Mongo.
 • Nếu không ghi được vào DB, ta xoá các file vừa lưu để ổ đĩa không chứa file "mồ côi" (file không có
   document nào tham chiếu).


3.4. Bước 3 – Phục vụ ảnh như file tĩnh
Trong server.js, dòng sau cho phép trình duyệt tải ảnh trực tiếp từ thư mục uploads mà không cần
viết route riêng:
SERVER.JS (TRÍCH)

  // Tình huống 1: phục vụ ảnh đã upload như file tĩnh
  // → http://localhost:3000/uploads/products/<tên-file>
  app.use(
     "/uploads",
     express.static(path.join(__dirname, "uploads"), { maxAge: "7d" })
  );

Như vậy, ảnh có url: "/uploads/products/P009-…jpg" được truy cập tại
http://localhost:3000/uploads/products/P009-…jpg. Tuỳ chọn maxAge: "7d" cho phép trình
duyệt lưu đệm (cache) ảnh 7 ngày.


3.5. Bước 4 – Đọc danh sách ảnh và xoá ảnh
ROUTES/PRODUCTS-DISK.JS (TRÍCH)

  // GET /api/products/:id/images – danh sách ảnh của một sản phẩm
  router.get("/:id/images", async (req, res) => {
    const p = await products().findOne(
       { _id: req.params.id },
       { projection: { name: 1, images: 1 } }
    );
    if (!p) return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
    res.json({ _id: p._id, name: p.name, images: p.images ?? [] });
  });


ROUTES/PRODUCTS-DISK.JS (TRÍCH)

  // DELETE /api/products/:id/images/:filename – xoá ảnh khỏi DB và khỏi ổ đĩa
  router.delete("/:id/images/:filename", async (req, res) => {
    // path.basename() bỏ phần thư mục → chặn kiểu tấn công "../../"
    const filename = path.basename(req.params.filename);
    const result = await products().updateOne(
       { _id: req.params.id },
       { $pull: { images: { filename } } }
    );
    if (result.modifiedCount === 0)
       return res.status(404).json({ error: "Không tìm thấy ảnh" });
    // Xoá file trên ổ đĩa (bỏ qua lỗi nếu file đã bị xoá thủ công)
    await fs.unlink(path.join(UPLOAD_DIR, filename)).catch(() => {});
    res.json({ deleted: filename });
  });

Xoá ảnh gồm hai việc: $pull phần tử khỏi mảng images trong MongoDB, sau đó xoá file trên ổ đĩa.
path.basename() loại bỏ mọi phần thư mục trong tham số, nên yêu cầu độc hại như DELETE
…/images/..%2F..%2Fserver.js không thể xoá file ngoài thư mục upload.

---

3.6. Chạy thử Tình huống 1
Upload 2 ảnh cho sản phẩm P009:
TERMINAL / COMMAND PROMPT

  curl -X POST http://localhost:3000/api/products/P009/images -F "images=@sample-
  images/laptop.jpg" -F "images=@sample-images/phone.jpg"

KẾT QUẢ

  {
      "added": 2,
      "images": [
        {
           "url": "/uploads/products/P009-1793960112822-edc043e0.jpg",
           "filename": "P009-1793960112822-edc043e0.jpg",
           "originalName": "laptop.jpg",
           "contentType": "image/jpeg",
           "size": 19945,
           "uploadedAt": "2026-11-06T10:15:12.823Z"
        },
        {
           "url": "/uploads/products/P009-1793960112822-38c3dd40.jpg",
           "filename": "P009-1793960112822-38c3dd40.jpg",
           "originalName": "phone.jpg",
           "contentType": "image/jpeg",
           "size": 21025,
           "uploadedAt": "2026-11-06T10:15:12.823Z"
        }
      ]
  }


Kiểm tra document trong mongosh:
MONGOSH

  db.products.findOne({ _id: "P009" }, { name: 1, images: 1 })

KẾT QUẢ

  {
      _id: 'P009',
      name: 'MacBook Air M3 13 inch',
      images: [
        {
           url: '/uploads/products/P009-1793960112822-edc043e0.jpg',
           filename: 'P009-1793960112822-edc043e0.jpg',
           originalName: 'laptop.jpg',
           contentType: 'image/jpeg',
           size: 19945,
           uploadedAt: ISODate('2026-11-06T10:15:12.823Z')
        },
        {
           url: '/uploads/products/P009-1793960112822-38c3dd40.jpg',
           filename: 'P009-1793960112822-38c3dd40.jpg',
           originalName: 'phone.jpg',
           contentType: 'image/jpeg',
           size: 21025,
           uploadedAt: ISODate('2026-11-06T10:15:12.823Z')
        }
      ]
  }


Thư mục uploads/products lúc này có đúng 2 file mang tên do server đặt (trên Windows dùng dir
uploads\products):

---

TERMINAL / COMMAND PROMPT

  ls -l uploads/products

KẾT QUẢ

  -rw-r--r-- 21025 P009-1793960112822-38c3dd40.jpg
  -rw-r--r-- 19945 P009-1793960112822-edc043e0.jpg


Kiểm tra ảnh được phục vụ như file tĩnh – tham số -I chỉ lấy phần tiêu đề (header) của phản hồi. Thay
<tên-file> bằng một giá trị filename ở trên:
TERMINAL / COMMAND PROMPT

  curl -I http://localhost:3000/uploads/products/<tên-file>

KẾT QUẢ

  HTTP/1.1 200 OK
  Cache-Control: public, max-age=604800
  Last-Modified: Fri, 06 Nov 2026 10:15:12 GMT
  ETag: W/"4de9-1a1b05af2b0"
  Content-Type: image/jpeg
  Content-Length: 19945


Content-Type: image/jpeg cho biết trình duyệt sẽ hiển thị nội dung này như một ảnh; Cache-
Control: public, max-age=604800 chính là 7 ngày đã cấu hình.

Các trường hợp lỗi – lần lượt: gửi file văn bản, gửi ảnh ~3 MB (vượt 2 MB), đặt sai tên trường (image
thay vì images), sản phẩm không tồn tại. Tham số -w "\n" chỉ để xuống dòng giữa các kết quả:
TERMINAL / COMMAND PROMPT

  curl -s -w "\n" -X POST http://localhost:3000/api/products/P009/images -F "images=@sample-
  images/khong-phai-anh.txt"
  curl -s -w "\n" -X POST http://localhost:3000/api/products/P009/images -F "images=@sample-
  images/anh-lon-3MB.jpg"
  curl -s -w "\n" -X POST http://localhost:3000/api/products/P009/images -F "image=@sample-
  images/laptop.jpg"
  curl -s -w "\n" -X POST http://localhost:3000/api/products/P999/images -F "images=@sample-
  images/laptop.jpg"

KẾT QUẢ

  {"error":"Định dạng text/plain không được hỗ trợ (chỉ nhận JPG, PNG, WEBP, GIF)"}
  {"error":"Ảnh vượt quá dung lượng cho phép","code":"LIMIT_FILE_SIZE"}
  {"error":"Tên trường file không đúng: \"image\"","code":"LIMIT_UNEXPECTED_FILE"}
  {"error":"Không tìm thấy sản phẩm"}


  Lưu ý: curl tự đoán Content-Type theo đuôi file nhưng không nhận ra .webp (gửi thành
  application/octet-stream và bị từ chối). Khi đó chỉ định rõ: -F "images=@sample-
  images/watch.webp;type=image/webp". Điều này cho thấy mimetype là giá trị do phía người gửi khai
  báo – xem thêm mục 6.1.

Thử giới hạn 8 ảnh: lần lượt upload 4 ảnh, 3 ảnh rồi 2 ảnh cho sản phẩm P011 (kết quả của các lần
thành công được rút gọn, chỉ giữ số ảnh đã thêm):

---

TERMINAL / COMMAND PROMPT

  curl -s -w "\n" -X POST http://localhost:3000/api/products/P011/images -F "images=@sample-
  images/laptop.jpg" -F "images=@sample-images/phone.jpg" -F "images=@sample-
  images/headphones.png" -F "images=@sample-images/watch.webp;type=image/webp"
  curl -s -w "\n" -X POST http://localhost:3000/api/products/P011/images -F "images=@sample-
  images/laptop.jpg" -F "images=@sample-images/phone.jpg" -F "images=@sample-
  images/headphones.png"
  curl -s -w "\n" -X POST http://localhost:3000/api/products/P011/images -F "images=@sample-
  images/laptop.jpg" -F "images=@sample-images/phone.jpg"

KẾT QUẢ

  {"added":4}
  {"added":3}
  {"error":"Mỗi sản phẩm tối đa 8 ảnh"}


Sau hai lần đầu, P011 có 7 ảnh; lần thứ ba thêm 2 ảnh sẽ thành 9 > 8 nên bị từ chối nhờ điều kiện $expr,
và hai file vừa ghi đã được dọn khỏi ổ đĩa:
MONGOSH

  db.products.findOne({ _id: "P011" }).images.length

KẾT QUẢ

  7


Xoá một ảnh (thay <tên-file> bằng filename thực tế):
TERMINAL / COMMAND PROMPT

  curl -X DELETE http://localhost:3000/api/products/P009/images/<tên-file>

KẾT QUẢ

  {"deleted":"P009-1793960112822-38c3dd40.jpg"}


3.7. Upload và hiển thị ảnh trên trang web
Phía giao diện, form phải có enctype="multipart/form-data"; ô chọn file có thuộc tính name trùng với
tên trường mà Multer chờ (images) và multiple nếu cho chọn nhiều ảnh:
HTML

  <form id="formDisk" enctype="multipart/form-data">
    <select id="productDisk"></select>
    <input type="file" name="images" accept="image/*" multiple>
    <button type="submit">Upload lên server</button>
  </form>
  <div id="galleryDisk"></div>

Gửi form bằng fetch và FormData (trích từ public/index.html):

---

JAVASCRIPT (TRÌNH DUYỆT)

  $("formDisk").addEventListener("submit", async e => {
    e.preventDefault();
    const id = $("productDisk").value;
    const res = await fetch(`/api/products/${id}/images`, {
      method: "POST",
      body: new FormData(e.target) // KHÔNG tự đặt header Content-Type
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    loadDisk(); // tải lại danh sách ảnh
  });

  async function loadDisk() {
    const res = await fetch(`/api/products/${$("productDisk").value}/images`);
    const { images } = await res.json();
    $("galleryDisk").innerHTML = images.map(img => `<img src="${img.url}">`).join("");
  }


  Cảnh báo: Khi gửi FormData, không tự đặt header Content-Type: multipart/form-data. Trình duyệt
  phải tự sinh header kèm chuỗi boundary; nếu ta đặt thủ công, server không tách được các phần và
  req.files sẽ rỗng.


3.8. Truy vấn trên dữ liệu ảnh
Vì thông tin ảnh là dữ liệu MongoDB bình thường, ta truy vấn được bằng mọi kỹ thuật đã học. Số sản
phẩm đã có ít nhất một ảnh (mảng có phần tử ở vị trí 0):
MONGOSH

  db.products.countDocuments({ "images.0": { $exists: true } })

KẾT QUẢ

  2


Thống kê số ảnh và tổng dung lượng ảnh của từng sản phẩm:
MONGOSH

  db.products.aggregate([
     { $match: { "images.0": { $exists: true } } },
     { $project: {
         name: 1,
         soAnh: { $size: "$images" },
         tongKB: { $round: [{ $divide: [{ $sum: "$images.size" }, 1024] }, 1] }
     } }
  ])

KẾT QUẢ

  [
      {
           _id: 'P009',
           name: 'MacBook Air M3 13 inch',
           soAnh: 1,
           tongKB: 19.5
      },
      {
           _id: 'P011',
           name: 'Dell Inspiron 14 5440',
           soAnh: 7,
           tongKB: 180.9
      }
  ]

---

Liệt kê 5 sản phẩm chưa có ảnh để nhân viên bổ sung:
MONGOSH

  db.products
    .find({ $or: [{ images: { $exists: false } }, { images: { $size: 0 } }] }, { name: 1 })
    .limit(5)

KẾT QUẢ

  [
      { _id: 'P001', name: 'iPhone 16 Pro 256GB' },
      { _id: 'P002', name: 'iPhone 16 128GB' },
      { _id: 'P003', name: 'iPhone 15 128GB' },
      { _id: 'P004', name: 'Samsung Galaxy S25 Ultra 512GB' },
      { _id: 'P005', name: 'Samsung Galaxy A56 5G' }
  ]


3.9. Khi triển khai ứng dụng thật
 • Không đưa thư mục uploads vào Git (.gitignore của dự án đã khai báo). Đây là dữ liệu của người
   dùng, không phải mã nguồn.
 • Sao lưu cả hai nơi. Backup MongoDB (mongodump) không bao gồm thư mục uploads; cần sao lưu
   thư mục này cùng lúc, nếu không đường dẫn trong DB sẽ trỏ tới file không còn tồn tại.
 • Ổ đĩa "tạm thời" trên nền tảng đám mây. Nhiều dịch vụ triển khai miễn phí/PaaS (ví dụ Render,
   Heroku, Vercel) xoá ổ đĩa của ứng dụng mỗi lần khởi động lại hoặc triển khai mới – ảnh upload sẽ
   mất. Khi đó hoặc gắn ổ đĩa bền vững (persistent disk), hoặc chuyển sang dịch vụ lưu trữ đối tượng.
 • Nhiều server chạy song song. Ảnh upload lên server A thì server B không có. Giải pháp: thư mục
   dùng chung (NFS) hoặc dịch vụ lưu trữ đối tượng.
 • Dịch vụ lưu trữ đối tượng (Amazon S3, Cloudinary, Firebase Storage, Azure Blob…) là cách phổ biến
   nhất trong thực tế. Mô hình giữ nguyên Tình huống 1: chỉ thay bước "ghi file xuống ổ đĩa" bằng
   "gửi file lên dịch vụ", sau đó lưu URL (và khoá/public_id để xoá) vào MongoDB. Ảnh được phân
   phối qua CDN nên tải rất nhanh.
 • Web server phục vụ file tĩnh. Ở môi trường production, thường để Nginx (hoặc CDN) phục vụ thư
   mục uploads thay cho Express để giảm tải cho Node.js.

---

Bài 4. Tình huống 2 – Lưu ảnh trực tiếp trong MongoDB

4.1. Hai cách lưu dữ liệu nhị phân
MongoDB có kiểu dữ liệu BinData (Binary) để chứa byte thô. Tuy nhiên mỗi document bị giới hạn 16
MB, vì vậy có hai cách lưu ảnh:

                           2a – BinData trong document                   2b – GridFS
                                                                         File được cắt thành các mảnh (chunk) 255 KB,
                           Một trường kiểu Binary nằm ngay trong
 Cấu trúc                                                                lưu trong 2 collection <bucket>.files và
                           document (ví dụ customers.avatar.data)
                                                                         <bucket>.chunks

 Giới hạn                  Cả document < 16 MB (thực tế nên < 1 MB)      Không giới hạn kích thước file
                                                                         API riêng GridFSBucket: openUploadStream,
 Đọc/ghi                   updateOne/findOne như dữ liệu thường
                                                                         openDownloadStream, delete

                           Avatar, icon, chữ ký, ảnh QR – ảnh nhỏ, đọc   Ảnh sản phẩm độ phân giải cao, PDF, video
 Phù hợp
                           cùng document                                 ngắn…


4.2. Cách 2a – Avatar khách hàng dạng BinData

Thiết kế dữ liệu
Thêm vào document customers một tài liệu con avatar:
JSON

  "avatar": {
    "data": <BinData – nội dung file PNG/JPG>,
    "contentType": "image/png",
    "size": 4514,
    "updatedAt": ISODate("2026-11-06T10:05:26Z")
  }


Upload avatar
Dùng memoryStorage với giới hạn 500 KB. req.file.buffer là kiểu Buffer của Node.js; MongoDB
Driver tự chuyển nó thành BinData khi ghi:

---

ROUTES/CUSTOMERS-AVATAR.JS (TRÍCH)

  // PUT /api/customers/:id/avatar – form-data, trường "avatar" (1 file)
  router.put("/:id/avatar", uploadAvatar.single("avatar"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Chưa chọn ảnh" });
    const result = await customers().updateOne(
       { _id: req.params.id },
       {
         $set: {
           avatar: {
             data: req.file.buffer, // Buffer của Node.js → được lưu thành BinData
             contentType: req.file.mimetype,
             size: req.file.size,
             updatedAt: new Date()
           }
         }
       }
    );
    if (result.matchedCount === 0)
       return res.status(404).json({ error: "Không tìm thấy khách hàng" });
    res.json({
       updated: req.params.id,
       size: req.file.size,
       url: `/api/customers/${req.params.id}/avatar`
    });
  });


Trả ảnh về trình duyệt
Thẻ <img> cần một URL trả về chính nội dung ảnh, không phải JSON. Route dưới đây đọc trường
avatar, đặt Content-Type đúng loại ảnh rồi gửi dữ liệu nhị phân:
ROUTES/CUSTOMERS-AVATAR.JS (TRÍCH)

  // GET /api/customers/:id/avatar – trả về file ảnh, dùng trong <img src="...">
  router.get("/:id/avatar", async (req, res) => {
    const c = await customers().findOne(
       { _id: req.params.id },
       { projection: { avatar: 1 } }
    );
    if (!c?.avatar) {
       return res.status(404).json({ error: "Khách hàng chưa có avatar" });
    }
    res.set("Content-Type", c.avatar.contentType);
    res.set("Cache-Control", "private, max-age=3600"); // trình duyệt lưu đệm 1 giờ
    // Binary (MongoDB) → Buffer (Node.js) rồi gửi về trình duyệt
    res.send(Buffer.from(c.avatar.data.buffer));
  });

Phía giao diện chỉ cần: <img src="/api/customers/C003/avatar">.

---

Không bao giờ trả về dữ liệu ảnh khi liệt kê
ROUTES/CUSTOMERS-AVATAR.JS (TRÍCH)

  // GET /api/customers – danh sách khách hàng, KHÔNG kèm dữ liệu ảnh (rất quan trọng)
  router.get("/", async (req, res) => {
    const list = await customers()
      .find(
        {},
        {
          projection: {
             fullName: 1,
             membership: 1,
             hasAvatar: { $gt: ["$avatar", null] }
          }
        }
      )
      .sort({ _id: 1 })
      .toArray();
    res.json(list);
  });


  Cảnh báo: Nếu viết customers.find({}) không có projection, mỗi khách hàng có avatar sẽ kéo theo
  hàng trăm KB dữ liệu nhị phân – danh sách 1.000 khách hàng có thể nặng hàng trăm MB. Luôn loại
  trường ảnh khi truy vấn danh sách; chỉ đọc ảnh ở route riêng.


Chạy thử Cách 2a
Upload avatar cho khách hàng C003:
TERMINAL / COMMAND PROMPT

  curl -X PUT http://localhost:3000/api/customers/C003/avatar -F "avatar=@sample-
  images/avatar.png"

KẾT QUẢ

  {"updated":"C003","size":4514,"url":"/api/customers/C003/avatar"}


Xem thông tin avatar trong mongosh (loại bỏ trường data để kết quả gọn):
MONGOSH

  db.customers.findOne(
    { _id: "C003" },
    { fullName: 1, "avatar.contentType": 1, "avatar.size": 1, "avatar.updatedAt": 1 }
  )

KẾT QUẢ

  {
      _id: 'C003',
      fullName: 'Lê Hoài Thảo',
      avatar: {
        contentType: 'image/png',
        size: 4514,
        updatedAt: ISODate('2026-11-06T10:15:16.869Z')
      }
  }


Quan sát trường data: kiểu con (subtype) 0 là dữ liệu nhị phân thông thường; chuỗi base64 bắt đầu
bằng iVBORw0KGgo chính là chữ ký nhận dạng của file PNG:

---

MONGOSH

  const d = db.customers.findOne({ _id: "C003" }).avatar.data;
  ({ subtype: d.sub_type, soByte: d.length(), base64: d.toString("base64").slice(0, 24) + "…" })

KẾT QUẢ

  { subtype: 0, soByte: 4514, base64: 'iVBORw0KGgoAAAANSUhEUgAA…' }


Document có avatar "nặng" hơn hẳn document không có avatar – toán tử $bsonSize cho biết kích
thước thực của document:
MONGOSH

  db.customers.aggregate([
     { $match: { _id: { $in: ["C003", "C004"] } } },
     { $project: { fullName: 1, kichThuocByte: { $bsonSize: "$$ROOT" } } }
  ])

KẾT QUẢ

  [
      { _id: 'C003', fullName: 'Lê Hoài Thảo', kichThuocByte: 4961 },
      { _id: 'C004', fullName: 'Trần Khánh Hạnh', kichThuocByte: 372 }
  ]


Kiểm tra route trả ảnh:
TERMINAL / COMMAND PROMPT

  curl -I http://localhost:3000/api/customers/C003/avatar

KẾT QUẢ

  HTTP/1.1 200 OK
  Content-Type: image/png
  Cache-Control: private, max-age=3600
  Content-Length: 4514


Avatar vượt 500 KB bị từ chối:
TERMINAL / COMMAND PROMPT

  curl -s -X PUT http://localhost:3000/api/customers/C003/avatar -F "avatar=@sample-images/anh-
  lon-3MB.jpg"

KẾT QUẢ

  {"error":"Ảnh vượt quá dung lượng cho phép","code":"LIMIT_FILE_SIZE"}


4.3. Cách 2b – Ảnh sản phẩm bằng GridFS

GridFS lưu file như thế nào?
GridFS là quy ước lưu file được mọi MongoDB Driver hỗ trợ. Một "bucket" (ở đây tên productImages)
gồm hai collection:

 • productImages.files – một document cho mỗi file: tên, kích thước (length), kích thước mảnh
   (chunkSize), ngày upload và metadata tuỳ ý (ta lưu productId, contentType).
 • productImages.chunks – nhiều document cho mỗi file: mỗi document chứa một mảnh dữ liệu
   (data), số thứ tự mảnh (n) và files_id trỏ về file.

---

                                  Hình 3. Ảnh 3 MB được GridFS cắt thành 12 chunk

Ghi file vào GridFS
openUploadStream() trả về một luồng ghi (writable stream); ta ghi Buffer của Multer vào luồng,
GridFS tự cắt mảnh và tạo document trong hai collection:
ROUTES/PRODUCTS-GRIDFS.JS (TRÍCH)

  // Ghi một Buffer vào GridFS, trả về _id (ObjectId) của file
  function saveToGridFS(file, productId) {
    return new Promise((resolve, reject) => {
      const stream = bucket().openUploadStream(file.originalname, {
        metadata: {
          productId,
          contentType: file.mimetype,
          originalName: file.originalname
        }
      });
      stream.once("error", reject);
      stream.once("finish", () => resolve(stream.id));
      stream.end(file.buffer);
    });
  }


ROUTES/PRODUCTS-GRIDFS.JS (TRÍCH)

  // POST /api/gridfs/products/:id/images – form-data, trường "images" (1–5 file)
  router.post(
    "/products/:id/images",
    uploadImages.array("images", 5),
    async (req, res) => {
      const exists = await getDb()
        .collection("products")
        .countDocuments({ _id: req.params.id });
      if (!exists) return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
      if (!req.files?.length)
        return res.status(400).json({ error: "Chưa chọn ảnh nào" });

           const saved = [];
           for (const f of req.files) {
             const id = await saveToGridFS(f, req.params.id);
             saved.push({ fileId: id, url: `/api/gridfs/images/${id}`, size: f.size });
           }
           res.status(201).json({ added: saved.length, images: saved });
       }
  );


Liệt kê, phục vụ và xoá file
bucket.find() truy vấn collection .files với cú pháp filter quen thuộc:

---

ROUTES/PRODUCTS-GRIDFS.JS (TRÍCH)

  // GET /api/gridfs/products/:id/images – liệt kê ảnh của sản phẩm (productImages.files)
  router.get("/products/:id/images", async (req, res) => {
    const files = await bucket()
       .find({ "metadata.productId": req.params.id })
       .sort({ uploadDate: 1 })
       .toArray();
    res.json(
       files.map(f => ({
         fileId: f._id,
         filename: f.filename,
         size: f.length,
         uploadDate: f.uploadDate,
         url: `/api/gridfs/images/${f._id}`
       }))
    );
  });

openDownloadStream() đọc lần lượt các chunk và stream về trình duyệt qua pipe(res) – server không
phải nạp cả file vào RAM. Header ETag giúp trình duyệt không tải lại ảnh đã có:
ROUTES/PRODUCTS-GRIDFS.JS (TRÍCH)

  // GET /api/gridfs/images/:fileId – "stream" nội dung ảnh từ MongoDB về trình duyệt
  router.get("/images/:fileId", async (req, res) => {
    if (!ObjectId.isValid(req.params.fileId))
      return res.status(400).json({ error: "fileId không hợp lệ" });
    const _id = new ObjectId(req.params.fileId);
    const [file] = await bucket().find({ _id }).toArray();
    if (!file) return res.status(404).json({ error: "Không tìm thấy ảnh" });

    res.set({
      "Content-Type": file.metadata?.contentType || "application/octet-stream",
      "Content-Length": file.length,
      // Nội dung ảnh không đổi theo _id → cho phép trình duyệt cache 1 ngày
      "Cache-Control": "public, max-age=86400",
      ETag: `"${file._id}"`
    });
    // Trình duyệt đã có bản cache trùng ETag → trả 304, không gửi lại dữ liệu
    if (req.headers["if-none-match"] === `"${file._id}"`) return res.status(304).end();
    bucket().openDownloadStream(_id).pipe(res);
  });


ROUTES/PRODUCTS-GRIDFS.JS (TRÍCH)

  // DELETE /api/gridfs/images/:fileId – xoá document trong .files và mọi chunk của file
  router.delete("/images/:fileId", async (req, res) => {
    if (!ObjectId.isValid(req.params.fileId))
      return res.status(400).json({ error: "fileId không hợp lệ" });
    try {
      await bucket().delete(new ObjectId(req.params.fileId));
    } catch {
      return res.status(404).json({ error: "Không tìm thấy ảnh" });
    }
    res.json({ deleted: req.params.fileId });
  });


Chạy thử Cách 2b
Upload một ảnh nhỏ (45 KB) và ảnh ~3 MB cho sản phẩm P010:

---

TERMINAL / COMMAND PROMPT

  curl -X POST http://localhost:3000/api/gridfs/products/P010/images -F "images=@sample-
  images/headphones.png" -F "images=@sample-images/anh-lon-3MB.jpg"

KẾT QUẢ

  {
      "added": 2,
      "images": [
        {
           "fileId": "6aeda8b703974631c4c6b9a9",
           "url": "/api/gridfs/images/6aeda8b703974631c4c6b9a9",
           "size": 45622
        },
        {
           "fileId": "6aeda8b703974631c4c6b9ab",
           "url": "/api/gridfs/images/6aeda8b703974631c4c6b9ab",
           "size": 3054454
        }
      ]
  }


Xem document trong productImages.files:
MONGOSH

  db.productImages.files.find({ "metadata.productId": "P010" })

KẾT QUẢ

  [
      {
           _id: ObjectId('6aeda8b703974631c4c6b9a9'),
           length: 45622,
           chunkSize: 261120,
           uploadDate: ISODate('2026-11-06T10:15:19.155Z'),
           filename: 'headphones.png',
           metadata: {
             productId: 'P010',
             contentType: 'image/png',
             originalName: 'headphones.png'
           }
      },
      {
           _id: ObjectId('6aeda8b703974631c4c6b9ab'),
           length: 3054454,
           chunkSize: 261120,
           uploadDate: ISODate('2026-11-06T10:15:19.170Z'),
           filename: 'anh-lon-3MB.jpg',
           metadata: {
             productId: 'P010',
             contentType: 'image/jpeg',
             originalName: 'anh-lon-3MB.jpg'
           }
      }
  ]


Đếm số chunk của từng file và tổng số byte – ảnh 3 MB được cắt thành 12 chunk (11 × 261.120 byte +
phần còn lại):

---

MONGOSH

  db.productImages.chunks.aggregate([
     { $group: {
          _id: "$files_id",
          soChunk: { $sum: 1 },
          tongByte: { $sum: { $binarySize: "$data" } }
     } },
     { $lookup: {
          from: "productImages.files",
          localField: "_id",
          foreignField: "_id",
          as: "f"
     } },
     { $project: { _id: 0, filename: { $first: "$f.filename" }, soChunk: 1, tongByte: 1 } },
     { $sort: { soChunk: 1 } }
  ])

KẾT QUẢ

  [
      { soChunk: 1, tongByte: 45622, filename: 'headphones.png' },
      { soChunk: 12, tongByte: 3054454, filename: 'anh-lon-3MB.jpg' }
  ]


Một chunk trông như sau (bỏ trường data cho gọn):
MONGOSH

  db.productImages.chunks.findOne({ n: 11 }, { data: 0 })

KẾT QUẢ

  {
      _id: ObjectId('6aeda8b703974631c4c6b9b7'),
      files_id: ObjectId('6aeda8b703974631c4c6b9ab'),
      n: 11
  }


Lấy ảnh qua API (thay <fileId> bằng giá trị fileId khi upload):
TERMINAL / COMMAND PROMPT

  curl -I http://localhost:3000/api/gridfs/images/<fileId>

KẾT QUẢ

  HTTP/1.1 200 OK
  Content-Type: image/png
  Content-Length: 45622
  Cache-Control: public, max-age=86400
  ETag: "6aeda8b703974631c4c6b9a9"


Khi trình duyệt gửi lại ETag đã lưu trong header If-None-Match, server trả 304 Not Modified mà
không gửi lại dữ liệu ảnh:
TERMINAL / COMMAND PROMPT

  curl -I -H "If-None-Match: \"<fileId>\"" http://localhost:3000/api/gridfs/images/<fileId>

KẾT QUẢ

  HTTP/1.1 304 Not Modified


Xoá ảnh 3 MB rồi kiểm tra: document trong .files và toàn bộ 12 chunk đều bị xoá:
TERMINAL / COMMAND PROMPT

  curl -X DELETE http://localhost:3000/api/gridfs/images/<fileId>

KẾT QUẢ

  {"deleted":"6aeda8b703974631c4c6b9ab"}

---

MONGOSH

  ({ files: db.productImages.files.countDocuments(), chunks:
  db.productImages.chunks.countDocuments() })

KẾT QUẢ

  { files: 1, chunks: 1 }


Hiển thị trên trang web
Giống Tình huống 1, chỉ khác URL của ảnh trỏ tới API thay vì file tĩnh:
JAVASCRIPT (TRÌNH DUYỆT)

  const files = await (await fetch(`/api/gridfs/products/${id}/images`)).json();
  gallery.innerHTML = files.map(f => `<img src="${f.url}">`).join("");
  // f.url có dạng /api/gridfs/images/6aed… → Express đọc từ MongoDB rồi trả về ảnh


4.4. Những điều cần lưu ý khi lưu ảnh trong MongoDB
 • Dung lượng database tăng nhanh. Gói miễn phí MongoDB Atlas M0 chỉ có 512 MB; vài trăm ảnh
   sản phẩm có thể dùng hết.
 • Bộ nhớ. memoryStorage giữ toàn bộ file trong RAM của server trong lúc xử lý. Phải đặt
   limits.fileSize hợp lý; với file rất lớn nên stream trực tiếp vào GridFS thay vì dùng Buffer.
 • Hiệu năng đọc. Mỗi lượt xem ảnh đều đi qua Node.js và MongoDB, chậm hơn phục vụ file tĩnh. Nên
   đặt Cache-Control/ETag (như demo) hoặc dùng CDN phía trước.
 • Ưu điểm lớn: nhất quán và sao lưu. Ảnh và dữ liệu nằm cùng một nơi: một lệnh mongodump sao lưu
   tất cả; xoá document là xoá được ảnh; nhiều server dùng chung một database không lo thiếu file.
 • Import lại shopdb không xoá GridFS. Script import_data chỉ thay 6 collection gốc; muốn xoá ảnh
   GridFS chạy db.productImages.files.drop(); db.productImages.chunks.drop().

---

Bài 5. So sánh và lựa chọn giải pháp

5.1. Bảng so sánh
                               1 – Ổ đĩa / Cloud + đường
 Tiêu chí                                                         2a – BinData               2b – GridFS
                               dẫn
 Kích thước ảnh phù
                               Mọi kích thước                     Nhỏ (< 1 MB)               Mọi kích thước
 hợp
 Tốc độ hiển thị               Nhanh nhất (file tĩnh, CDN)        Trung bình (qua API)       Trung bình (qua API, stream)
 Dung lượng database           Rất nhỏ (chỉ metadata)             Tăng theo ảnh              Tăng theo ảnh
 Sao lưu, khôi phục            Phải sao lưu 2 nơi                 Một lệnh mongodump         Một lệnh mongodump
                               Có thể lệch (file mồ côi, link     Rất tốt (ảnh nằm trong
 Nhất quán dữ liệu                                                                           Tốt (cùng database)
                               hỏng)                              document)
                               Cần ổ chung hoặc cloud
 Nhiều server / PaaS                                              Không vấn đề               Không vấn đề
                               storage
                               Cần cấu hình thêm (URL ký,         Dễ (kiểm tra quyền trong   Dễ (kiểm tra quyền trong
 Phân quyền xem ảnh
                               middleware)                        route)                     route)
 Độ phức tạp mã nguồn          Thấp                               Thấp                       Trung bình
 Chi phí lưu trữ               Rẻ (ổ đĩa, object storage)         Đắt hơn (dung lượng DB)    Đắt hơn (dung lượng DB)


5.2. Khuyến nghị
 • Ảnh công khai, nhiều, cần tải nhanh (ảnh sản phẩm, bài viết, banner): chọn Tình huống 1. Khi triển
   khai thật, thay ổ đĩa bằng dịch vụ lưu trữ đối tượng (S3, Cloudinary…) và vẫn lưu URL trong
   MongoDB.
 • Ảnh nhỏ gắn chặt với một bản ghi (avatar, chữ ký điện tử, mã QR): 2a – BinData đơn giản và nhất
   quán, miễn là kích thước được kiểm soát chặt.
 • File riêng tư, cần kiểm soát quyền truy cập, hoặc hệ thống không có ổ đĩa bền vững (hồ sơ, hoá
   đơn, chứng từ; ứng dụng chạy trên PaaS): 2b – GridFS.
 • Đồ án môn học: Tình huống 1 với thư mục uploads là dễ triển khai nhất; nếu đưa ứng dụng lên
   Render/Vercel và dùng MongoDB Atlas, cân nhắc GridFS hoặc Cloudinary để ảnh không bị mất sau
   mỗi lần triển khai.

---

Bài 6. Bảo mật và lỗi thường gặp

6.1. Danh sách kiểm tra bảo mật khi cho phép upload
 • Giới hạn dung lượng và số lượng file bằng limits của Multer – chống tấn công làm đầy ổ
   đĩa/RAM.
 • Kiểm tra định dạng. mimetype do client khai báo nên có thể bị giả mạo (đổi tên virus.exe thành
   anh.jpg). Để chắc chắn, đọc vài byte đầu của file và so với chữ ký định dạng (magic bytes), ví dụ
   dùng thư viện file-type.
 • Không chấp nhận SVG từ người dùng nếu không xử lý kỹ: SVG là XML và có thể chứa JavaScript.
 • Tự đặt tên file trên server (như demo), không dùng originalname – tránh trùng tên, ký tự đặc biệt
   và đường dẫn kiểu ../../.
 • Dùng path.basename() với mọi tên file lấy từ URL/tham số trước khi thao tác với ổ đĩa.
 • Xác thực và phân quyền: chỉ người đăng nhập (và có quyền) mới được upload/xoá – thêm
   middleware xác thực trước Multer.
 • Không cho thực thi file trong thư mục upload; chỉ phục vụ như file tĩnh.


6.2. Lỗi thường gặp
 Hiện tượng / Lỗi                           Nguyên nhân và cách khắc phục
                                            Form thiếu enctype="multipart/form-data"; quên gắn middleware
 req.file / req.files là undefined          Multer vào route; hoặc tự đặt header Content-Type khi gửi FormData
                                            bằng fetch.
 MulterError: Unexpected field              Tên trường file ở form (name="image") khác tên khai báo ở server
 (LIMIT_UNEXPECTED_FILE)                    (upload.array("images")).
                                            File vượt limits.fileSize hoặc số file vượt giới hạn – thông báo cho
 LIMIT_FILE_SIZE, LIMIT_FILE_COUNT
                                            người dùng, không phải lỗi máy chủ.
                                            Middleware xử lý lỗi đặt trước các route hoặc không kiểm tra err
 Lỗi Multer trả về trang HTML 500
                                            instanceof multer.MulterError.

 Ảnh upload thành công nhưng không          Thiếu express.static cho thư mục upload, hoặc url lưu trong DB không
 hiển thị (404)                             khớp đường dẫn phục vụ.
 MongoServerError: BSONObj size: …
 is invalid (mã 10334) hoặc                 Document vượt giới hạn 16 MB – chuyển sang GridFS hoặc giới hạn dung
 RangeError: offset is out of               lượng ảnh chặt hơn.
 bounds khi ghi BinData

                                            Gửi đối tượng Binary thay vì Buffer: dùng
 Ảnh avatar bị lỗi hiển thị                 Buffer.from(doc.avatar.data.buffer); hoặc thiếu header Content-
                                            Type.

 Đã cập nhật ảnh nhưng trình duyệt vẫn      Ảnh bị cache. Thêm tham số thay đổi vào URL (?t=…) như demo, hoặc đặt
 hiện ảnh cũ                                tên/_id mới cho mỗi phiên bản ảnh.
 Ảnh biến mất sau khi triển khai lại trên   Ổ đĩa tạm thời của PaaS bị xoá – dùng persistent disk, cloud storage hoặc
 Render/Heroku                              GridFS.
 Danh sách khách hàng/sản phẩm tải rất      Truy vấn danh sách kéo theo dữ liệu ảnh BinData – thêm projection loại
 chậm                                       trường ảnh.

---

Bài 7. Bài tập thực hành

7.1. Thêm route PATCH /api/products/:id/images/:filename/primary đặt một ảnh làm ảnh đại
diện của sản phẩm (trường isPrimary: true), đồng thời bỏ isPrimary ở các ảnh còn lại. Gợi ý:
updateOne với $set: { "images.$[].isPrimary": false } rồi $set lại phần tử được chọn bằng
toán tử vị trí $, hoặc một lệnh duy nhất với arrayFilters.
7.2. Viết truy vấn liệt kê các danh mục (category) kèm số sản phẩm chưa có ảnh trong danh mục đó,
sắp xếp giảm dần.
7.3. Cho phép khách hàng upload avatar theo Tình huống 1 (lưu file vào uploads/avatars/, lưu
avatarUrl trong customers). So sánh mã nguồn với cách BinData.

7.4. Dùng thư viện sharp để tạo ảnh thu nhỏ (thumbnail) 300 px trước khi lưu. Lưu cả ảnh gốc và
thumbnail; danh sách sản phẩm chỉ dùng thumbnail.

7.5. Viết script cleanup.js tìm file mồ côi: các file trong uploads/products không được tham chiếu
bởi bất kỳ images.filename nào trong MongoDB, và in ra danh sách (chưa xoá).
7.6. Viết script chuyển đổi toàn bộ ảnh của Tình huống 1 sang GridFS: với mỗi phần tử trong
products.images, đọc file trên ổ đĩa, ghi vào bucket productImages kèm metadata.productId, sau
đó cập nhật url mới trong document.
7.7. Bổ sung kiểm tra magic bytes bằng thư viện file-type: sau khi nhận file, nếu nội dung thật không
phải ảnh thì xoá file và trả lỗi 400. Thử lại với một file .txt được đổi đuôi thành .jpg.