-- Clarify a source gap observed in approved Gemini sample B; never invent prices.
BEGIN;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='1s';
DO $migration$
DECLARE
 previous_answer constant text := $previous$PawPal có các loại phòng theo danh mục Pet Hotel. Mình có thể giúp bạn so sánh giá, sức chứa và tiện ích của từng loại phòng.
(Quy định: Chỉ hiển thị loại phòng đang được cung cấp.)$previous$;
 corrected_answer constant text := $corrected$FAQ này chưa có mức giá cụ thể, sức chứa hoặc tiện ích của phòng thường và VIP nên chưa đủ thông tin để so sánh hoặc tính chênh lệch. Cần đối chiếu bảng giá và thông tin phòng đang được cung cấp trong danh mục Pet Hotel trước khi tư vấn. Không suy đoán giá hoặc tiện ích và không coi nội dung FAQ này là báo giá đã xác nhận.$corrected$;
 faq public.chatbot_knowledge_faq%ROWTYPE;
BEGIN
 SELECT * INTO STRICT faq FROM public.chatbot_knowledge_faq
 WHERE question='Phòng Hotel thường và VIP khác nhau về giá thế nào?' FOR UPDATE;
 IF faq.answer=corrected_answer THEN RETURN; END IF;
 IF faq.answer IS DISTINCT FROM previous_answer THEN
  RAISE EXCEPTION 'hotel_faq_changed_review_required' USING ERRCODE='22023';
 END IF;
 UPDATE public.chatbot_knowledge_faq SET answer=corrected_answer,updated_at=clock_timestamp() WHERE id=faq.id;
EXCEPTION
 WHEN no_data_found THEN RAISE EXCEPTION 'hotel_faq_missing_review_required' USING ERRCODE='22023';
 WHEN too_many_rows THEN RAISE EXCEPTION 'hotel_faq_ambiguous_review_required' USING ERRCODE='22023';
END $migration$;
COMMIT;
