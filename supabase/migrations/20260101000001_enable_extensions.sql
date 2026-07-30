-- pgcrypto: gen_random_uuid()用
-- vector: pgvectorによるFAQ類似検索用（D-011: text-embedding-3-small, 1536次元）
create extension if not exists pgcrypto;
create extension if not exists vector;
