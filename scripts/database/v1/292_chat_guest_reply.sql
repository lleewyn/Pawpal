BEGIN;

-- Keep the API's guidance when the sentiment level alone suggests escalation.
-- The membership guard still blocks escalation and handles explicit or loop transfers.
DO $migration$
DECLARE
 fn regprocedure := 'public.post_public_chat_message(uuid,uuid,timestamptz,uuid,uuid,text,text,boolean,integer,text,boolean,boolean)'::regprocedure;
 current_definition text := pg_get_functiondef(fn);
 previous_guard text := $old$ IF needs_handoff AND NOT pawpal_private.chat_customer_can_handoff(c.customer_id) THEN
  needs_handoff:=false;loop_handoff:=false;
  p_reply:='Để trò chuyện với nhân viên, bạn vui lòng đăng nhập hoặc thiết lập mật khẩu để trở thành thành viên tại [Đăng nhập](/login). Nội dung trao đổi vẫn được giữ. Nếu gặp khó khăn khi kích hoạt hoặc cần phản ánh thanh toán, bạn có thể gửi yêu cầu tại [Liên hệ](/contact).';
 END IF;$old$;
 revised_guard text := $new$ IF needs_handoff AND NOT pawpal_private.chat_customer_can_handoff(c.customer_id) THEN
  IF p_handover OR loop_handoff OR p_reply IS NULL THEN
   p_reply:='PawPal hiểu bạn muốn trao đổi trực tiếp với nhân viên. Bạn [đăng nhập](/login) hoặc thiết lập mật khẩu thành viên để tiếp tục nhé. Nội dung đã trao đổi vẫn được giữ. Nếu bạn gặp khó khăn khi đăng nhập hoặc cần phản ánh thanh toán, bạn có thể gửi thông tin qua mục [Liên hệ](/contact).';
  END IF;
  needs_handoff:=false;loop_handoff:=false;
 END IF;$new$;
BEGIN
 IF strpos(current_definition,revised_guard)>0 THEN RETURN; END IF;
 IF strpos(current_definition,previous_guard)=0 THEN
  RAISE EXCEPTION 'Unexpected membership guard in %',fn;
 END IF;
 EXECUTE replace(current_definition,previous_guard,revised_guard);
END
$migration$;

COMMIT;
