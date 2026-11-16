import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { type ChatStorageConfig } from "./attachment.config.js";
import {
  type ChatObjectStorage,
  type ListedObject,
  type PresignedUpload,
  type StoredObjectInfo,
} from "./object-storage.port.js";

function isNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const name = "name" in error ? error.name : undefined;
  const status =
    "$metadata" in error &&
    typeof error.$metadata === "object" &&
    error.$metadata !== null &&
    "httpStatusCode" in error.$metadata
      ? error.$metadata.httpStatusCode
      : undefined;
  return name === "NotFound" || name === "NoSuchKey" || status === 404;
}

/** RFC 6266 Content-Disposition with an ASCII fallback and a UTF-8 filename*. */
export function contentDisposition(disposition: "inline" | "attachment", filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/**
 * AWS S3 / S3-compatible adapter (AWS SDK v3). The bucket must be private;
 * clients only ever receive short-lived presigned URLs for one key. A
 * separate signing client can target a browser-reachable endpoint
 * (`publicEndpoint`) while the API talks to an internal one.
 */
export class S3ObjectStorage implements ChatObjectStorage {
  private readonly client: S3Client;
  private readonly signer: S3Client;

  constructor(private readonly config: ChatStorageConfig) {
    const base: S3ClientConfig = {
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      ...(config.accessKeyId && config.secretAccessKey
        ? {
            credentials: {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            },
          }
        : {}),
      // Checksums are verified by the API itself on completion; do not make
      // browsers send SDK-computed checksum headers on presigned PUTs.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    };
    this.client = new S3Client({
      ...base,
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    });
    const signingEndpoint = config.publicEndpoint ?? config.endpoint;
    this.signer = new S3Client({
      ...base,
      ...(signingEndpoint ? { endpoint: signingEndpoint } : {}),
    });
  }

  async presignPut(
    key: string,
    options: { contentType: string; expiresInSeconds: number },
  ): Promise<PresignedUpload> {
    const url = await getSignedUrl(
      this.signer,
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        ContentType: options.contentType,
      }),
      { expiresIn: options.expiresInSeconds, signableHeaders: new Set(["content-type"]) },
    );
    return { url, headers: { "Content-Type": options.contentType } };
  }

  presignGet(
    key: string,
    options: {
      expiresInSeconds: number;
      contentType: string;
      disposition: "inline" | "attachment";
      filename: string;
    },
  ): Promise<string> {
    return getSignedUrl(
      this.signer,
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        ResponseContentType: options.contentType,
        ResponseContentDisposition: contentDisposition(options.disposition, options.filename),
        ResponseCacheControl: "private, max-age=300",
      }),
      { expiresIn: options.expiresInSeconds },
    );
  }

  async head(key: string): Promise<StoredObjectInfo | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
      return { sizeBytes: result.ContentLength ?? 0, lastModified: result.LastModified ?? null };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async read(key: string): Promise<AsyncIterable<Uint8Array> | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
      const body = result.Body;
      if (!body || !(Symbol.asyncIterator in body)) return null;
      // SDK boundary: in Node the body is an IncomingMessage (async iterable of
      // Buffer chunks); the runtime check above guards the narrowing.
      return body as AsyncIterable<Uint8Array>;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }

  async list(
    prefix: string,
    options: { startAfter?: string; maxKeys: number },
  ): Promise<{ objects: ListedObject[]; nextStartAfter: string | null }> {
    const result = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: prefix,
        MaxKeys: options.maxKeys,
        ...(options.startAfter ? { StartAfter: options.startAfter } : {}),
      }),
    );
    const objects = (result.Contents ?? [])
      .filter((item): item is typeof item & { Key: string } => typeof item.Key === "string")
      .map((item) => ({ key: item.Key, lastModified: item.LastModified ?? null }));
    const last = objects[objects.length - 1];
    return { objects, nextStartAfter: result.IsTruncated && last ? last.key : null };
  }
}
