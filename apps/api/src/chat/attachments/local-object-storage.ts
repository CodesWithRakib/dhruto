import fs from "node:fs";
import path from "node:path";
import {
  type ChatObjectStorage,
  type ListedObject,
  type PresignedUpload,
  type StoredObjectInfo,
} from "./object-storage.port.js";

export class LocalObjectStorage implements ChatObjectStorage {
  private readonly baseDir: string;
  private readonly baseUrl: string;

  constructor(options?: { baseDir?: string; baseUrl?: string }) {
    this.baseDir = options?.baseDir ?? path.resolve(process.cwd(), "uploads", "chat");
    const port = process.env.PORT || "4000";
    const apiPrefix = (process.env.API_PREFIX || "/api/v1").replace(/\/$/, "");
    this.baseUrl =
      options?.baseUrl ??
      process.env.CHAT_STORAGE_LOCAL_BASE_URL ??
      `http://localhost:${port}${apiPrefix}/chat/storage`;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolvePath(key: string): string {
    const safeKey = key.replace(/^[/\\]+/, "").replace(/\.\./g, "_");
    const fullPath = path.resolve(this.baseDir, safeKey);
    const parent = path.dirname(fullPath);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    return fullPath;
  }

  async presignPut(
    key: string,
    options: { contentType: string; expiresInSeconds: number },
  ): Promise<PresignedUpload> {
    const url = `${this.baseUrl}/upload?key=${encodeURIComponent(key)}`;
    return {
      url,
      headers: {
        "content-type": options.contentType,
      },
    };
  }

  async presignGet(
    key: string,
    options: {
      expiresInSeconds: number;
      contentType: string;
      disposition: "inline" | "attachment";
      filename: string;
    },
  ): Promise<string> {
    return `${this.baseUrl}/download?key=${encodeURIComponent(key)}&filename=${encodeURIComponent(options.filename)}&disposition=${options.disposition}`;
  }

  async head(key: string): Promise<StoredObjectInfo | null> {
    const filePath = this.resolvePath(key);
    try {
      const stat = await fs.promises.stat(filePath);
      return {
        sizeBytes: stat.size,
        lastModified: stat.mtime,
      };
    } catch {
      return null;
    }
  }

  async read(key: string): Promise<AsyncIterable<Uint8Array> | null> {
    const filePath = this.resolvePath(key);
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
      return fs.createReadStream(filePath);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // Idempotent
    }
  }

  async list(
    prefix: string,
    options: { startAfter?: string; maxKeys: number },
  ): Promise<{ objects: ListedObject[]; nextStartAfter: string | null }> {
    const prefixDir = this.resolvePath(prefix);
    const objects: ListedObject[] = [];
    if (!fs.existsSync(prefixDir)) {
      return { objects: [], nextStartAfter: null };
    }
    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile()) {
          const relKey = path.relative(this.baseDir, full).replace(/\\/g, "/");
          const stat = fs.statSync(full);
          objects.push({ key: relKey, lastModified: stat.mtime });
        }
      }
    };
    walk(prefixDir);
    objects.sort((a, b) => a.key.localeCompare(b.key));
    const startIndex = options.startAfter ? objects.findIndex((o) => o.key > options.startAfter!) : 0;
    const slice = objects.slice(startIndex, startIndex + options.maxKeys);
    const nextStartAfter =
      slice.length === options.maxKeys ? slice[slice.length - 1]?.key ?? null : null;
    return { objects: slice, nextStartAfter };
  }
}
