import AWS from "aws-sdk";

const s3 = new AWS.S3({
  endpoint: "https://s3.us-east-1.wasabisys.com",
  region: process.env.WASABI_REGION,
  accessKeyId: process.env.WASABI_KEY,
  secretAccessKey: process.env.WASABI_SECRET,
  s3ForcePathStyle: true
});

export default async function handler(req, res) {
  const bucket = process.env.WASABI_BUCKET;

  try {
    const data = await s3.listObjectsV2({
      Bucket: bucket,
      Prefix: "" // 🔧 Aquí podrías poner un directorio raíz como "mockups/"
    }).promise();

    const items = data.Contents
      .filter(obj => obj.Key.includes("PREVIEW/"))
      .map(obj => {
        const category = obj.Key.split("/")[0]; // carpeta principal
        const filename = obj.Key.split("/").pop();

        return {
          category,
          filename,
          previewUrl: s3.getSignedUrl("getObject", {
            Bucket: bucket,
            Key: obj.Key,
            Expires: 3600 // 1h
          }),
          editableUrl: s3.getSignedUrl("getObject", {
            Bucket: bucket,
            Key: obj.Key.replace("PREVIEW", "EDITABLES"),
            Expires: 3600
          })
        };
      });

    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}