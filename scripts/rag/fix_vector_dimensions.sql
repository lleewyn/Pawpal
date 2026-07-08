-- Do API Model Embedding mới nhất của Google xuất ra vector 3072 chiều (thay vì 768), 
-- bạn vui lòng chạy đoạn mã này để nới rộng cột và cập nhật lại hàm tìm kiếm nhé:

-- 1. Xóa index cũ (nếu có)
drop index if exists document_embeddings_embedding_idx;

-- 2. Đổi kiểu dữ liệu cột sang 3072
alter table document_embeddings alter column embedding type vector(3072);

-- 3. (Bỏ qua việc tạo index vì dữ liệu của chúng ta nhỏ, và pgvector giới hạn index ở 2000 chiều)

-- 4. Cập nhật lại hàm (thay đổi tham số đầu vào từ 768 -> 3072)
create or replace function match_documents (
  query_embedding vector(3072),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    document_embeddings.id,
    document_embeddings.content,
    document_embeddings.metadata,
    1 - (document_embeddings.embedding <=> query_embedding) as similarity
  from document_embeddings
  where 1 - (document_embeddings.embedding <=> query_embedding) > match_threshold
  order by document_embeddings.embedding <=> query_embedding
  limit match_count;
$$;
