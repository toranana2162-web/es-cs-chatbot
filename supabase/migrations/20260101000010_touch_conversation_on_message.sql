-- Phase 2実装で判明したギャップの是正: messagesへINSERTされた際、親conversationの
-- last_message_at/updated_atを自動更新するトリガー。
-- 顧客・オペレーターいずれもconversationsへのUPDATE権限を持たない（RLSで意図的に制限、
-- SECURITY.md §4）ため、SECURITY DEFINERでこの限定的な更新のみバイパスする。
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row
  execute function public.touch_conversation_on_message();
