// api/uploads/presign.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

/**
 * Env you already set in Vercel:
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_REGION = "us-east-1"
 *   S3_BUCKET = "oso-media-uploads"
 *   CDN_BASE_URL (optional) e.g. https://oso-media-uploads.s3.us-east-1.amazonaws.com
 */
const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION = "us-east-1",
  S3_BUCKET,
  CDN_BASE_URL,
} = process.env;

// Single S3 client reused across invocations
const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

// Basic CORS helper
function allowCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
}

export default async function handler(req, res) {
  allowCors(res);

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { filename, type, folder } = req.body || {};
    if (!filename || !type) {
      return res.status(400).json({ error: "filename and type required" });
    }

    // Key: optional folder + timestamp + sanitized filename
    const safeName = String(filename).replace(/\s+/g, "_");
    const key = `${folder ? `${folder}/` : ""}${Date.now()}-${safeName}`;

    // Build a PutObject command WITHOUT ACL (bucket has ACLs disabled)
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: type,
      // ❌ Do NOT include: ACL: "public-read"
    });

    // 10 minute presign
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });

    // Public URL (use CDN_BASE_URL if provided, else S3 website form)
    const publicUrl =
      CDN_BASE_URL && CDN_BASE_URL.trim().length > 0
        ? `${CDN_BASE_URL.replace(/\/+$/, "")}/${key}`
        : `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;

    return res.status(200).json({ uploadUrl, publicUrl, key });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate URL" });
  }
}

