# CRCL Admin Sign-Off SOP

## Control Layer

The CRCL admin surface lives in the Buildrbrand admin app (`crcl-admin`) and is responsible for launch control, moderation, finance, and operational messaging.

## Required Checks

1. Users: search users, suspend/restore accounts, delete accounts, and promote/demote creator status.
2. Creators: suspend/restore creators, delete creators, and demote creator privileges.
3. Applications: approve or reject creator applications stored in Supabase auth metadata.
4. Broadcast: send platform DMs to all users, creators, or fans from `ADMIN_SENDER_PROFILE_ID`.
5. Finance: review gross volume, 15% platform earnings, processor/merchant fees, creator net, and recent transaction logs.
6. Content: delete policy-breaking posts and related comments/media.
7. Live: force-end stuck live streams.

## Payment Oversight

Finance estimates are sourced from CRCL Supabase tables and Buildrbrand tenant fee configuration. If the tenant fee row is unavailable, the admin app falls back to `CRCL_PLATFORM_FEE_RATE` or `0.15`.
