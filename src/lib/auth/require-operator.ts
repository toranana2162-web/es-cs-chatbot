import "server-only";

import { redirect } from "next/navigation";

import { getCurrentOperator } from "@/lib/auth/get-current-operator";
import type { OperatorProfile } from "@/types/domain";

export interface OperatorSession {
  userId: string;
  profile: OperatorProfile;
}

/**
 * オペレーター管理画面のページ・Server Actionで使う認証チェック。
 * getCurrentOperator()（未ログイン・非オペレーターの場合はnull）を、
 * 管理画面向けにログイン画面へのredirectへ変換する薄いラッパー。
 */
export async function requireOperator(): Promise<OperatorSession> {
  const profile = await getCurrentOperator();

  if (!profile) {
    redirect("/operator/login");
  }

  return { userId: profile.userId, profile };
}
