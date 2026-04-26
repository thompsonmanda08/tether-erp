import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * ImageKit Authentication Endpoint
 * Generates authentication parameters for client-side uploads
 *
 * Required environment variables:
 * - IMAGEKIT_PRIVATE_KEY: Your ImageKit private key
 * - NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY: Your ImageKit public key
 */
export async function GET() {
  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;

    if (!privateKey || !publicKey) {
      return NextResponse.json(
        {
          error: "ImageKit configuration is missing",
          message:
            "Please set IMAGEKIT_PRIVATE_KEY and NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY environment variables",
        },
        { status: 500 },
      );
    }

    // Generate authentication parameters
    const token = crypto.randomBytes(16).toString("hex");
    const expire = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const signature = crypto
      .createHmac("sha1", privateKey)
      .update(token + expire)
      .digest("hex");

    return NextResponse.json({
      token,
      expire: expire.toString(), // Convert to string for ImageKit
      signature,
    });
  } catch (error) {
    console.error("ImageKit auth error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate authentication parameters",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
