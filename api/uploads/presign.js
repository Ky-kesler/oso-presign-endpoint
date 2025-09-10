import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION = "us-east-1",
  S3_BUCKET,
  CDN_BASE_URL
} = process.env;

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
});

function allowCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
}

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { filename, contentType, folder = "uploads" } = (typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}));

    if (!S3_BUCKET) {
      return res.status(500).json({ error: "S3_BUCKET not configured" });
    }
    if (!filename || !contentType) {
      return res.status(400).json({ error: "filename and contentType are required" });
    }

    const ext = filename.includes(".") ? filename.split(".").pop() : "";
    const key = `${folder}/${randomUUID()}-${Date.now()}${ext ? "." + ext : ""}`;

    const putCommand = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ACL: "public-read"
    });

    const uploadUrl = await getSignedUrl(s3, putCommand, { expiresIn: 60 });

    const publicUrl = CDN_BASE_URL
      ? `${CDN_BASE_URL.replace(/\/$/, "")}/${key}`
      : `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;

    return res.status(200).json({ uploadUrl, key, publicUrl });
  } catch (err) {
    console.error("presign error", err);
    return res.status(500).json({ error: "Failed to presign" });
  }
}
