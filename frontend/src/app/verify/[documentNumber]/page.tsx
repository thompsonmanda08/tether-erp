import { Metadata } from "next";
import { verifyDocument } from "@/app/_actions/verification";
import { VerificationResult } from "./verification-result";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Document Verification | Tether-ERP",
  description:
    "Verify the authenticity of documents using QR code verification",
};

interface VerifyPageProps {
  params: Promise<{
    documentNumber: string;
  }>;
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { documentNumber } = await params;
  const decodedDocumentNumber = decodeURIComponent(documentNumber);

  // Fetch verification result on the server with fresh data
  const result = await verifyDocument(decodedDocumentNumber);

  return (
    <div className="min-h-screen ">
      <VerificationResult
        documentNumber={decodedDocumentNumber}
        result={result}
      />
    </div>
  );
}
