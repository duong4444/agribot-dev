-- Fix FTS Boost Logic
-- Run this with: psql -U your_user -d agri_chatbot -f fix-fts-boost.sql

DROP FUNCTION IF EXISTS search_crop_knowledge_fts(text, varchar, integer, real, text) CASCADE;

CREATE OR REPLACE FUNCTION public.search_crop_knowledge_fts(
  search_query text,
  p_user_id varchar DEFAULT NULL,
  result_limit integer DEFAULT 10, -- số kết quả
  min_rank real DEFAULT 0.01,  -- ngưỡng rank
  crop_filter text DEFAULT NULL
)
RETURNS TABLE(
  chunk_id varchar,
  loai_cay varchar,
  chu_de_lon varchar,
  tieu_de_chunk varchar,
  noi_dung text,
  metadata jsonb,
  rank real, -- điểm xếp hạng
  headline text -- đoạn highlight kết quả
)
LANGUAGE plpgsql AS $$
DECLARE -- kbao biến
  query tsquery; -- tsquery cho FTS
  normalized_query text; -- query đã chuẩn hoá
  normalized_crop_filter text; -- crop filter đã chuẩn hoá
  query_words text[]; -- mảng các từ trong query
  word text; -- biến tạm cho từng từ
  or_query text; -- query dạng OR
BEGIN
  -- lowercase + trim()
  normalized_query := normalize_vietnamese_text(search_query);
  
  IF crop_filter IS NOT NULL THEN
    normalized_crop_filter := normalize_vietnamese_text(crop_filter);
  END IF;
  -- note có dấu
  -- [array chứa các từ query] ['cach', 'tri', 'benh', 'loet', 'ca', 'phe']
  query_words := string_to_array(normalized_query, ' ');

  or_query := '';
  
  FOREACH word IN ARRAY query_words LOOP
    IF length(word) > 2 THEN -- chỉ lấy từ có 2 ký tự
      IF or_query = '' THEN -- 
        or_query := word;
      ELSE -- "|| là toán tử nối chuỗi" 
        or_query := or_query || ' | ' || word;
      END IF;
    END IF;
  END LOOP;
  -- kết quả : cach | tri | benh | loet | phe
  -- dùng OR vì tìm chunks có ít nhất 1 từ trong query, tăng recall (số lượng kết quả)
  -- hàm FTS  search_crop_knowledge_fts: chuẩn hoá query , tách từ , 
  -- tạo OR(to_tsquery) hoặc AND(plainto_tsquery)
  /** 
  chuyển đổi query string thành tsquery(kiểu dữ liệu đặc biệt của psql cho FTS)
  +) plainto_tsquery()
  chuyển plain text thành tsquery, tự động handle stopwords
  tự thêm "&" giữa các từ
  Kết quả: 'cach' & 'tri' & 'benh'
  (Tìm documents có CẢ 3 từ)
  +) or_query()
  chuyển query string có operators thành tsquery
  hỗ trợ operators | , & , ! tức __or_and_not__
  note có dạng như thế nào, tsquery:
  dạng hiển thị thì 'cach' | 'tri' | 'benh'
  lưu dưới dạng cấu trúc dữ liệu nhị phân (binary tree) để tối ưu tìm kiếm.
  Query cho FTS: tsquery
  Document cho FTS: tsvector
  SELECT to_tsquery('simple', 'cach | tri');
-- 'cach' | 'tri'
  SELECT to_tsvector('simple', 'cach tri benh loet');
-- 'benh':3 'cach':1 'loet':4 'tri':2
Matching với @@ operator , @@ là toán từ FTS của psql
SELECT to_tsvector('simple', 'cach tri benh') @@ to_tsquery('simple', 'cach | loet');
-- TRUE (vì document có 'cach')
SELECT to_tsvector('simple', 'cach tri benh') @@ to_tsquery('simple', 'cach & loet');
-- FALSE (vì document không có 'loet')
  */
  IF or_query = '' THEN
    query := plainto_tsquery('simple', normalized_query);
  ELSE
    query := to_tsquery('simple', or_query);
  END IF;
  -- xem cấu trúc SELECT to_tsquery('simple', 'cach | tri | benh');
  RETURN QUERY
  SELECT 
    ck.chunk_id,
    ck.loai_cay,
    ck.chu_de_lon,
    ck.tieu_de_chunk,
    ck.noi_dung,
    ck.metadata,
    (
-- Có bao nhiêu từ khóa xuất hiện
-- Xuất hiện nhiều → điểm cao
-- Khoảng cách giữa các từ khóa
-- Từ khóa gần nhau → điểm cao
-- Rải rác → điểm thấp
-- Độ phủ (cover)
-- Một đoạn ngắn chứa đủ từ khóa → tốt hơn đoạn dài
      ts_rank_cd(ck.search_vector, query, 32) -- base rank từ FTS
      *
      -- FIXED: Check if search_query contains field (not vice versa)
      CASE 
        WHEN lower(search_query) LIKE '%' || lower(ck.loai_cay) || '%' THEN 2.5
        WHEN lower(search_query) LIKE '%' || lower(ck.tieu_de_chunk) || '%' THEN 2.0
        WHEN lower(search_query) LIKE '%' || lower(ck.chu_de_lon) || '%' THEN 1.5
        ELSE 1.0
      END
      *
      CASE -- query match exact tieu_de_chunk
        WHEN position(normalized_query IN normalize_vietnamese_text(ck.tieu_de_chunk)) > 0 
        THEN 10.0
        ELSE 1.0
      END
    )::real AS rank, -- ép kiểu trong psql
    ts_headline('simple', ck.noi_dung, query, 'MaxWords=50, MinWords=25, ShortWord=3, HighlightAll=false') AS headline
  FROM crop_knowledge_chunks ck
  WHERE 
    ck.search_vector @@ query
    AND ck.status = 'active'
    AND (p_user_id IS NULL OR ck.user_id = p_user_id)
    AND ts_rank_cd(ck.search_vector, query) >= min_rank
    AND (crop_filter IS NULL OR normalize_vietnamese_text(ck.loai_cay) LIKE '%' || normalized_crop_filter || '%')
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$;

-- Verify the function was created
SELECT 'Function search_crop_knowledge_fts has been updated successfully!' AS status;
