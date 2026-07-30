-- D-008: オペレーターの担当開始は先着1名とする
-- assigned_operator_idがNULLの場合のみ成功する原子的なUPDATE。
-- 2名が同時に呼び出しても、Postgresの行ロックにより後続のUPDATEはWHERE句に一致せず0件更新となり、
-- 先に成功した1名だけがreturning行を得る（NULLが返れば「既に担当者決定済み」と判定する）。
-- SECURITY INVOKERで実行するため、呼び出し元がRLS上operator_profiles登録済みであることが前提。
create or replace function public.claim_conversation(
  p_conversation_id uuid,
  p_operator_id uuid
)
returns public.conversations
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_conversation public.conversations;
begin
  update public.conversations
  set assigned_operator_id = p_operator_id,
      status = 'operator_handling',
      claimed_at = now(),
      updated_at = now()
  where id = p_conversation_id
    and assigned_operator_id is null
  returning * into v_conversation;

  return v_conversation;
end;
$$;
