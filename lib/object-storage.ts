import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3"

const BUCKET = process.env.MINIO_BUCKET || "images"

const s3 = new S3Client({
  endpoint: `${process.env.MINIO_USE_SSL === "true" ? "https" : "http"}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT || "9000"}`,
  region: "us-east-1", // requerido por el SDK, MinIO lo ignora
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
})

let bucketReady: Promise<void> | null = null

async function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      try {
        await s3.send(new HeadBucketCommand({ Bucket: BUCKET }))
      } catch {
        await s3.send(new CreateBucketCommand({ Bucket: BUCKET }))
      }
    })().catch((err) => {
      bucketReady = null // permitir reintentar en la próxima llamada
      throw err
    })
  }
  return bucketReady
}

export async function uploadObject(key: string, body: Buffer, contentType: string) {
  await ensureBucket()
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
}

export async function deleteObject(key: string) {
  await ensureBucket()
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export async function getObject(key: string) {
  await ensureBucket()
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const bytes = await res.Body!.transformToByteArray()
  return { bytes: Buffer.from(bytes), contentType: res.ContentType || "application/octet-stream" }
}

export function imageUrlFor(key: string) {
  return `/api/images/${key}`
}

export function parseImageKeyFromUrl(url: string | null | undefined) {
  if (typeof url !== "string") return null
  const match = url.match(/^\/api\/images\/(.+)$/)
  return match ? match[1] : null
}
