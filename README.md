# oso-presign-endpoint

Serverless API for generating S3 **presigned PUT URLs** so the app can upload directly to your bucket.

## Endpoint
`POST /api/uploads/presign`

Body JSON:
```json
{ "filename": "myvideo.mp4", "contentType": "video/mp4", "folder": "events" }
```

Response:
```json
{ "uploadUrl": "...", "key": "events/uuid-timestamp.mp4", "publicUrl": "https://..." }
```

## Env Vars (already added in Vercel)
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_REGION=us-east-1
- S3_BUCKET=oso-media-uploads
- CDN_BASE_URL=https://oso-media-uploads.s3.us-east-1.amazonaws.com/

## CORS
CORS is open (`*`) so your BuildFire app can call it.
