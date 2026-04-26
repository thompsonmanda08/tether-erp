/**
 * ImageKit Configuration and Utilities
 * Handles image uploads to ImageKit CDN
 */

export interface ImageKitConfig {
  publicKey: string;
  urlEndpoint: string;
  authenticationEndpoint: string;
}

export interface UploadResponse {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  height: number;
  width: number;
  size: number;
  filePath: string;
  fileType: string;
}

export interface UploadError {
  message: string;
  help?: string;
}

/**
 * Get ImageKit configuration from environment variables
 */
export function getImageKitConfig(): ImageKitConfig {
  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  const authenticationEndpoint =
    process.env.NEXT_PUBLIC_IMAGEKIT_AUTH_ENDPOINT || "/api/imagekit-auth";

  if (!publicKey || !urlEndpoint) {
    throw new Error(
      "ImageKit configuration is missing. Please set NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY and NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT",
    );
  }

  return {
    publicKey,
    urlEndpoint,
    authenticationEndpoint,
  };
}

/**
 * Upload image to ImageKit
 */
export async function uploadToImageKit(
  file: File,
  folder: string = "organizations",
  onProgress?: (progress: number) => void,
): Promise<UploadResponse> {
  try {
    const config = getImageKitConfig();

    // Get authentication parameters from backend
    const authResponse = await fetch(config.authenticationEndpoint);
    if (!authResponse.ok) {
      throw new Error("Failed to get authentication parameters");
    }
    const authData = await authResponse.json();

    // Prepare form data
    const formData = new FormData();
    formData.append("file", file);
    formData.append("publicKey", config.publicKey);
    formData.append("signature", authData.signature);
    formData.append("expire", authData.expire);
    formData.append("token", authData.token);
    formData.append("fileName", file.name);
    formData.append("folder", folder);

    // Upload to ImageKit
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error("Failed to parse upload response"));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.message || "Upload failed"));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload cancelled"));
      });

      xhr.open("POST", "https://upload.imagekit.io/api/v1/files/upload");
      xhr.send(formData);
    });
  } catch (error) {
    console.error("ImageKit upload error:", error);
    throw error;
  }
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.",
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "File size exceeds 10MB. Please choose a smaller image.",
    };
  }

  return { valid: true };
}

/**
 * Generate ImageKit transformation URL
 */
export function getTransformedImageUrl(
  url: string,
  transformations: {
    width?: number;
    height?: number;
    quality?: number;
    format?: "jpg" | "png" | "webp" | "auto";
    crop?: "maintain_ratio" | "force" | "at_least" | "at_max";
  },
): string {
  if (!url) return "";

  const config = getImageKitConfig();

  // If URL is already from ImageKit, add transformations
  if (url.includes(config.urlEndpoint)) {
    const transformParams: string[] = [];

    if (transformations.width)
      transformParams.push(`w-${transformations.width}`);
    if (transformations.height)
      transformParams.push(`h-${transformations.height}`);
    if (transformations.quality)
      transformParams.push(`q-${transformations.quality}`);
    if (transformations.format)
      transformParams.push(`f-${transformations.format}`);
    if (transformations.crop) transformParams.push(`c-${transformations.crop}`);

    if (transformParams.length > 0) {
      const transformString = `tr:${transformParams.join(",")}`;
      // Insert transformation before the file path
      return url.replace(
        config.urlEndpoint,
        `${config.urlEndpoint}/${transformString}`,
      );
    }
  }

  return url;
}
