-- Data-only correction, based on the guest/member booking paths in this repository.
-- Does not insert missing FAQ, activate it, or replace independently edited content.
BEGIN;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='1s';
DO $migration$
DECLARE
 previous_answer constant text := $previous$Bạn chọn dịch vụ, thông tin thú cưng và thời gian phù hợp rồi thực hiện xác nhận đặt lịch theo hướng dẫn trên hệ thống.
(Quy định: Thành viên cần đăng nhập để sử dụng chức năng đặt lịch.)$previous$;
 corrected_answer constant text := $corrected$Chọn dịch vụ, nhập hoặc chọn thông tin bé cưng, chọn thời gian phù hợp, kiểm tra báo giá và gửi yêu cầu đặt lịch. Thành viên đăng nhập để sử dụng hồ sơ bé của tài khoản. Khách vãng lai có thể dùng luồng dành cho khách vãng lai, cung cấp thông tin liên hệ và hồ sơ bé; cần giữ phiên khách hoặc thông tin khôi phục để xem lại yêu cầu. Sau khi gửi, hãy kiểm tra biên nhận và trạng thái lịch; đã tiếp nhận yêu cầu chưa có nghĩa là đã thanh toán hoặc đã được cửa hàng duyệt.$corrected$;
 faq public.chatbot_knowledge_faq%ROWTYPE;
BEGIN
 SELECT * INTO STRICT faq FROM public.chatbot_knowledge_faq
 WHERE question='Đặt lịch PawPal như thế nào?' FOR UPDATE;
 IF faq.answer=corrected_answer THEN RETURN; END IF;
 IF faq.answer IS DISTINCT FROM previous_answer THEN
  RAISE EXCEPTION 'booking_faq_changed_review_required' USING ERRCODE='22023';
 END IF;
 UPDATE public.chatbot_knowledge_faq SET answer=corrected_answer,updated_at=clock_timestamp() WHERE id=faq.id;
EXCEPTION
 WHEN no_data_found THEN RAISE EXCEPTION 'booking_faq_missing_review_required' USING ERRCODE='22023';
 WHEN too_many_rows THEN RAISE EXCEPTION 'booking_faq_ambiguous_review_required' USING ERRCODE='22023';
END $migration$;
COMMIT;
