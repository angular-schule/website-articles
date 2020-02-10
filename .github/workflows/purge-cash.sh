curl -X POST "https://api.cloudflare.com/client/v4/zones/${PURGE_ZONE}/purge_cache" \
     -H "Authorization: Bearer ${PURGE_API_TOKEN}" \
     -H "Content-Type: application/json" \
     --data '{"purge_everything":true}'
