# Google Auth & Secrets (Stage CRM)

## Secret Source of Truth
Doppler project: `stage-crm`
Configs:
- `dev`
- `prd`

## Required Secrets
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_CLIENT_JSON` (raw uploaded JSON backup)
- `AUTH_SECRET`
- `AUTH_TRUST_HOST=true`
- `EVENTS_API_BASE_URL`
- `EVENTS_ADMIN_PASSWORD`

## How to Read Secrets (authorized users)
```bash
# list names only
 doppler secrets --project stage-crm --config prd --only-names

# read one secret
 doppler secrets get GOOGLE_CLIENT_ID --project stage-crm --config prd --plain
```

## How to Sync to Vercel
```bash
cd ~/code/the-shift/stage
for ENV in production preview development; do
  for KEY in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET AUTH_SECRET AUTH_TRUST_HOST EVENTS_API_BASE_URL EVENTS_ADMIN_PASSWORD; do
    VAL=$(doppler secrets get "$KEY" --project stage-crm --config prd --plain)
    vercel env rm "$KEY" "$ENV" --yes >/dev/null 2>&1 || true
    printf "%s" "$VAL" | vercel env add "$KEY" "$ENV" --yes
  done
done
```

## Access Policy
- Keep secrets only in Doppler + Vercel env
- Never commit credentials into git
- Rotate Google client secret if leaked
