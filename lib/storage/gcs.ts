import { Storage } from '@google-cloud/storage'

const projectId = process.env.GCP_PROJECT_ID
const bucketName = process.env.GCP_STORAGE_BUCKET
const clientEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL
const privateKeyRaw = process.env.GCP_PRIVATE_KEY

if (!projectId || !bucketName || !clientEmail || !privateKeyRaw) {
  throw new Error('GCP storage environment variables are missing (GCP_PROJECT_ID, GCP_STORAGE_BUCKET, GCP_SERVICE_ACCOUNT_EMAIL, GCP_PRIVATE_KEY)')
}

const privateKey = privateKeyRaw.replace(/\\n/g, '\n')

export const storage = new Storage({
  projectId,
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  },
})

export const bucket = storage.bucket(bucketName)