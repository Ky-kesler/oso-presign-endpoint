import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION = "us-east-1",
  S3_BUCKET,
} = process.env;

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { filename, type, folder } = req.body;

    if (!filename || !type) {
      return res.status(400).json({ error: "filename and type required" });
    }

    const key = `${folder || "uploads"}/${Date.now()}-${filename}`;
    console.log("Generated key:", key);
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: type,
      ACL: "public-read"
    });

    // ✅ No ACL added here — avoids AccessControlListNotSupported error
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
    const publicUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;

    return res.status(200).json({ uploadUrl, publicUrl, key });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to generate URL" });
  }
}
