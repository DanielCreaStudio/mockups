// /api/wasabi.js
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.WASABI_REGION || "us-east-1";
const ENDPOINT = "https://s3.us-east-1.wasabisys.com"; // cambia si tu región es otra
const BUCKET = process.env.WASABI_BUCKET;

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.WASABI_KEY,
    secretAccessKey: process.env.WASABI_SECRET
  },
  forcePathStyle: true
});

export default async function handler(req, res) {
  try {
    const list = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      // Opcional: si tienes un prefijo raíz como "mockups/"
      // Prefix: "mockups/"
    }));

    const items = (list.Contents || [])
      .filter(o => o.Key.includes("PREVIEW/"))
      .slice(0, 5000) // por si tienes miles, evita respuestas gigantes
      .map(o => o.Key);

    // Generamos signed URLs en paralelo
    const results = await Promise.all(items.map(async (key) => {
      const category = key.split("/")[0];
      const filename = key.split("/").pop();

      const previewUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: key }),
        { expiresIn: 60 * 60 } // 1h
      );

      const editableKey = key.replace("PREVIEW", "EDITABLES");
      const editableUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: editableKey }),
        { expiresIn: 60 * 60 }
      );

      return { category, filename, previewUrl, editableUrl };
    }));

    res.status(200).json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Server error" });
  }
}

