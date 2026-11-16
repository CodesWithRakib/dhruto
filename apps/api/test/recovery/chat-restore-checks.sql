-- Communication platform — post-restore integrity checks (Phase 8).
-- Run against a RESTORED copy; every row of the result must show ok = true.
-- Read-only except the final transaction, which is rolled back.

WITH checks AS (
  -- 1. Migrations: all three communication migrations present.
  SELECT 'migrations 0010-0012 present' AS check_name,
         (SELECT count(*) FROM migrations WHERE name IN (
           'CommunicationPhase1Foundation1700000000010',
           'CommunicationPhase2Backend1700000000011',
           'CommunicationPhase7AdminCenter1700000000012')) = 3 AS ok
  UNION ALL
  -- 2. Sequence integrity: per conversation, messages are 1..last_message_sequence without gaps.
  SELECT 'message sequences gap-free and match counters',
         NOT EXISTS (
           SELECT 1 FROM chat_conversations c
           LEFT JOIN (SELECT conversation_id, count(*) AS n, max(sequence) AS mx FROM chat_messages GROUP BY conversation_id) m
             ON m.conversation_id = c.id
            WHERE coalesce(m.mx, 0) <> c.last_message_sequence OR coalesce(m.n, 0) <> c.last_message_sequence)
  UNION ALL
  -- 3. Cursors never exceed the conversation counter.
  SELECT 'participant cursors within bounds',
         NOT EXISTS (SELECT 1 FROM chat_participants p JOIN chat_conversations c ON c.id = p.conversation_id
                      WHERE p.last_read_sequence > c.last_message_sequence
                         OR p.last_delivered_sequence < p.last_read_sequence)
  UNION ALL
  -- 4. Referential integrity of attachments, reports, notes.
  SELECT 'attachments reference existing messages/conversations',
         NOT EXISTS (SELECT 1 FROM chat_attachments a LEFT JOIN chat_messages m ON m.id = a.message_id
                      WHERE a.message_id IS NOT NULL AND m.id IS NULL)
  UNION ALL
  SELECT 'reports and notes reference existing conversations',
         NOT EXISTS (SELECT 1 FROM chat_reports r LEFT JOIN chat_conversations c ON c.id = r.conversation_id WHERE c.id IS NULL)
     AND NOT EXISTS (SELECT 1 FROM chat_internal_notes n LEFT JOIN chat_conversations c ON c.id = n.conversation_id WHERE c.id IS NULL)
  UNION ALL
  -- 5. Malware-gate invariants survived the restore.
  SELECT 'CLEAN verdicts bound to the verified checksum',
         NOT EXISTS (SELECT 1 FROM chat_attachments
                      WHERE scan_status = 'CLEAN' AND (scanned_at IS NULL OR (scanned_sha256 IS NOT NULL AND scanned_sha256 <> checksum_sha256)))
  UNION ALL
  -- 6. Audit immutability trigger restored (checked below by an UPDATE attempt as well).
  SELECT 'audit immutability trigger present',
         EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'TRG_chat_audit_logs_immutable' AND NOT tgisinternal)
  UNION ALL
  -- 7. Outbox: no chat event stuck in PROCESSING (would need relay recovery after restore).
  SELECT 'no chat outbox events stuck in PROCESSING',
         NOT EXISTS (SELECT 1 FROM event_outbox WHERE aggregate_type = 'chat_conversation' AND status = 'PROCESSING')
  UNION ALL
  -- 8. Grants table and constraints restored.
  SELECT 'staff grant constraints present',
         (SELECT count(*) FROM pg_constraint WHERE conname IN ('CHK_chat_staff_grants_permission', 'CHK_chat_staff_grants_reason')) = 2
)
SELECT check_name, ok FROM checks;

-- Audit rows must still be immutable after restore (expect an error, then rollback).
BEGIN;
DO $$
BEGIN
  BEGIN
    UPDATE chat_audit_logs SET reason = 'tamper' WHERE id = (SELECT id FROM chat_audit_logs LIMIT 1);
    RAISE NOTICE 'AUDIT IMMUTABILITY: FAILED (update succeeded)';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'AUDIT IMMUTABILITY: ok (update rejected: %)', SQLERRM;
  END;
END $$;
ROLLBACK;
