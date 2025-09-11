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
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
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
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { filename, type, folder } = req.body;

    if (!filename || !type) {
      return res.status(400).json({ error: "filename and type required" });
    }

    const key = `${folder || "uploads"}/${Date.now()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: type,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });

    const publicUrl = CDN_BASE_URL
      ? `${CDN_BASE_URL}/${key}`
      : `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;

    return res.status(200).json({ uploadUrl, publicUrl, key });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to generate URL" });
  }
}
