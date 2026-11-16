#!/usr/bin/env bash
# Samples resource usage during a load run every 5 s until killed.
# Usage: sample-resources.sh <out.csv> <pg-container> <redis-container> <db-name> <api-port>...
out="$1"; pg="$2"; redis="$3"; db="$4"; shift 4
echo "ts,pg_cpu,pg_mem,redis_cpu,redis_mem,pg_connections,redis_clients,redis_used_memory,chat_outbox_pending,api_rss_mb" > "$out"
while true; do
  ts=$(date +%s)
  stats=$(docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemUsage}}' "$pg" "$redis" 2>/dev/null)
  pgline=$(echo "$stats" | grep "^$pg," | cut -d, -f2-3 | sed 's/ \/ .*//')
  rline=$(echo "$stats" | grep "^$redis," | cut -d, -f2-3 | sed 's/ \/ .*//')
  conns=$(docker exec "$pg" psql -U postgres -d "$db" -At -c "SELECT count(*) FROM pg_stat_activity WHERE datname = '$db'" 2>/dev/null)
  outbox=$(docker exec "$pg" psql -U postgres -d "$db" -At -c "SELECT count(*) FROM event_outbox WHERE status IN ('PENDING','PROCESSING') AND aggregate_type = 'chat_conversation'" 2>/dev/null)
  rinfo=$(docker exec "$redis" redis-cli INFO clients 2>/dev/null | grep connected_clients | cut -d: -f2 | tr -d '\r')
  rmem=$(docker exec "$redis" redis-cli INFO memory 2>/dev/null | grep '^used_memory_human' | cut -d: -f2 | tr -d '\r')
  rss=""
  for p in "$@"; do
    r=$(curl -s "http://127.0.0.1:$p/health/metrics" | sed -n 's/.*"rssMb":\([0-9.]*\).*/\1/p')
    rss="${rss}${rss:+|}${r}"
  done
  echo "$ts,$pgline,$rline,$conns,$rinfo,$rmem,$outbox,$rss" >> "$out"
  sleep 5
done
