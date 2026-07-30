import "server-only";

/**
 * このモジュールはクライアントコンポーネントから絶対にimportしないこと。
 * RLSを完全にバイパスするため、faqs検索など「顧客の直接参照を禁止しサーバー処理経由でのみ
 * アクセスする」設計（SECURITY.md §4 faqs）でのみ使用する。
 */
export { createAdminClient } from "./create-admin-client";
