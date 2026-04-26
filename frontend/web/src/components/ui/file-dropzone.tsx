/* eslint-disable @next/next/no-img-element */
"use client";

import {
  CheckCircle as CheckCircleIcon,
  CloudUpload as CloudArrowUpIcon,
  FileUp as DocumentArrowUpIcon,
  X as XMarkIcon
} from "lucide-react";
import { motion } from "framer-motion";
import * as React from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import { twMerge } from "tailwind-merge";

import { MAX_FILE_SIZE, staggerContainerItemVariants } from "@/lib/constants";
import { cn } from "@/lib/utils";
import Loader from "./loader";

const variants = {
  base: cn(
    "relative rounded-md flex justify-center items-center flex-col cursor-pointer min-h-[150px] min-w-[200px] border border-dashed border-border transition-colors duration-200 ease-in-out"
  ),
  image: "border-0 p-0 min-h-0 min-w-0 relative  dark:bg-foreground-900 rounded-md",
  active: "border-2",
  disabled:
    "bg-muted border-border cursor-default pointer-events-none bg-opacity-30",
  accept: "border border-blue-500 bg-blue-500 bg-opacity-10",
  reject: "border border-red-700 bg-red-700 bg-opacity-10"
};

const ERROR_MESSAGES = {
  fileTooLarge(maxSize: any) {
    return `The file is too large. Max size is ${formatFileSize(maxSize)}.`;
  },
  fileInvalidType() {
    return "Invalid file type.";
  },
  tooManyFiles(maxFiles: any) {
    return `You can only add ${maxFiles} file(s).`;
  },
  fileNotSupported() {
    return "The file is not supported.";
  }
};

export default function UploadField(
  {
    label,
    isLoading,
    required,
    handleFile,
    acceptedFiles,
    options,
    ...props
  }: {
    label?: string;
    isLoading?: boolean;
    required?: boolean;
    handleFile: (file: File) => void;
    acceptedFiles?: Record<string, string[] | string>;
    options?: any;
    props?: any;
  },
  ref?: any
) {
  return (
    <motion.div key={"step-2-1"} className="w-full" variants={staggerContainerItemVariants}>
      <label className="text-foreground/80 mb-2 text-xs font-medium capitalize">
        {label} {required && <span className="font-bold text-red-500"> *</span>}
      </label>
      <SingleFileDropzone
        ref={ref}
        isLandscape
        className={"min-h-8 px-2"}
        disabled={isLoading}
        isLoading={isLoading}
        dropzoneOptions={{
          maxSize: MAX_FILE_SIZE,
          maxFiles: 1, // Only 1 file allowed
          accept: acceptedFiles,
          ...options
        }}
        onChange={(file) => handleFile(file as File)}
        {...props}
      />
    </motion.div>
  );
}

export const SingleFileDropzone = React.forwardRef<any, DropZoneProps>(
  (
    {
      dropzoneOptions = {
        maxSize: MAX_FILE_SIZE,
        maxFiles: 1 // Only 1 file allowed
      },
      width,
      height,
      value,
      className,
      disabled,
      onChange,
      file,
      isMultipleFiles = false,
      isLandscape,
      isLoading = false,
      showPreview = false,
      isUploaded = false,
      preview = ""
    },
    ref
  ) => {
    const [imagePreview, setImagePreview] = React.useState(preview);

    const imageUrl = React.useMemo(() => {
      if (typeof value === "string") {
        // in case a url is passed in, use it to display the image
        return value;
      } else if (value) {
        // in case a file is passed in, create a base64 url to display the image
        return URL.createObjectURL(value);
      }

      return null;
    }, [value]);

    // dropzone configuration
    const {
      getRootProps,
      getInputProps,
      acceptedFiles,
      fileRejections,
      isFocused,
      isDragAccept,
      isDragReject
    } = useDropzone({
      multiple: isMultipleFiles,
      disabled,
      onDrop: async (acceptedFiles) => {
        // OF THE MULTIPLE FILE ADD GET ONLY ONE
        const file = acceptedFiles[0] as File;

        if (file) {
          // Enhanced security validation
          try {
            // Check for executable file extensions
            const dangerousExtensions = [
              "exe",
              "bat",
              "cmd",
              "com",
              "pif",
              "scr",
              "vbs",
              "js",
              "jar",
              "sh",
              "ps1",
              "msi",
              "dll",
              "app",
              "deb",
              "rpm",
              "dmg"
            ];

            const extension = file.name.split(".").pop()?.toLowerCase();
            if (extension && dangerousExtensions.includes(extension)) {
              console.error("Executable files are not allowed");
              return;
            }

            // Validate file type matches extension
            const allowedMimeTypes: Record<string, string[]> = {
              "application/pdf": ["pdf"],
              "image/jpeg": ["jpg", "jpeg"],
              "image/png": ["png"],
              "image/webp": ["webp"],
              "application/vnd.ms-excel": ["xls"],
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
              "text/csv": ["csv"]
            };

            const validExtensions = allowedMimeTypes[file.type];
            if (!validExtensions || !extension || !validExtensions.includes(extension)) {
              console.error("File type and extension do not match");
              return;
            }

            // Check file size
            if (file.size > MAX_FILE_SIZE) {
              console.error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
              return;
            }

            // Basic file content validation (check first few bytes)
            const firstBytes = await readFileBytes(file, 8);
            if (!isValidFileSignature(firstBytes, file.type)) {
              console.error("Invalid file signature detected");
              return;
            }

            const fileObject = Object.assign(file, {
              preview: URL.createObjectURL(file)
            });

            const imagePreview = fileObject?.preview;

            void onChange?.(file, imagePreview);
          } catch (error) {
            console.error("File validation failed:", error);
          }
        }
      },
      ...dropzoneOptions,
      maxSize: MAX_FILE_SIZE, // 5MB - files larger than this will be rejected
      accept: dropzoneOptions?.accept || { "application/pdf": [".pdf"] }
    });

    React.useImperativeHandle(ref, () => ({
      clear() {
        setImagePreview("");
        onChange?.(undefined, undefined);
      }
    }));

    // styling
    const dropZoneClassName = React.useMemo(
      () =>
        twMerge(
          variants.base,
          isFocused && variants.active,
          disabled && variants.disabled,
          imageUrl && variants.image,
          (isDragReject ?? fileRejections[0]) && variants.reject,
          isDragAccept && variants.accept,
          className
        ).trim(),
      [isFocused, imageUrl, fileRejections, isDragAccept, isDragReject, disabled, className]
    );

    // error validation messages
    const errorMessage = React.useMemo(() => {
      if (fileRejections[0]) {
        const { errors } = fileRejections[0];

        if (errors[0]?.code === "file-too-large") {
          return ERROR_MESSAGES.fileTooLarge(dropzoneOptions?.maxSize ?? 0);
        } else if (errors[0]?.code === "file-invalid-type") {
          return ERROR_MESSAGES.fileInvalidType();
        } else if (errors[0]?.code === "too-many-files") {
          return ERROR_MESSAGES.tooManyFiles(dropzoneOptions?.maxFiles ?? 0);
        } else {
          return ERROR_MESSAGES.fileNotSupported();
        }
      }

      return undefined;
    }, [fileRejections, dropzoneOptions]);

    React.useEffect(() => {
      if (acceptedFiles[0] || file) {
        setImagePreview(URL.createObjectURL(acceptedFiles[0] || file));
      } else {
        setImagePreview(preview);
      }
    }, [value, acceptedFiles, file]);

    return (
      <div>
        <div
          {...getRootProps({
            className: dropZoneClassName,
            style: {
              width,
              height
            }
          })}>
          {/* Main File Input */}
          <input ref={ref} {...getInputProps()} />

          {isLoading ? (
            // Image Preview
            <Loader
              isLandscape
              aria-label="Loading..."
              className={"items-center"}
              classNames={{
                wrapper: "min-w-full min-h-full p-2.5 items-center",
                text: "mt-0 font-medium text-sm",
                spinner: "w-7 h-7"
              }}
              loadingText="Uploading..."
            />
          ) : showPreview && (imagePreview || acceptedFiles[0] || file) ? (
            <div className="aspect-video max-h-40 w-80">
              <img
                alt={acceptedFiles[0]?.name || file?.name}
                className="h-full w-full rounded-md object-contain"
                src={imagePreview || imageUrl || ""}
              />
            </div>
          ) : (isUploaded && file) || acceptedFiles[0] ? (
            // ********************* FILE UPLOAD PREVIEW ******************* //
            <div
              className={cn("relative flex flex-col items-center py-2", {
                "w-full flex-row items-center justify-between": isLandscape
              })}>
              <DocumentArrowUpIcon
                className={cn("absolute h-24 w-24 text-muted-foreground/30", {
                  "m-0 h-8 w-8": isLandscape
                })}
              />
              <div
                className={cn("relative z-10 flex flex-col items-center gap-4", {
                  "bg-red-10 w-full gap-0": isLandscape
                })}>
                {!isLandscape && (
                  // ONLY SHOWS ON THE UPRIGHT COMPONENT
                  <p className="flex items-center gap-2 font-bold uppercase">
                    <CheckCircleIcon className="h-7 w-7 font-bold text-green-500" />
                    Your file is ready
                  </p>
                )}
                <span className="text-primary flex w-full max-w-sm items-center gap-2 truncate text-xs font-semibold lg:text-sm">
                  {isLandscape && <CheckCircleIcon className="h-6 w-6 text-green-500" />}{" "}
                  {acceptedFiles[0]?.name || file?.name}
                </span>
                {/* // ONLY SHOWS ON THE UPRIGHT COMPONENT */}
                {/* {!isLandscape && (
                  <Button isDisabled className={'opacity-100'}>
                    Change
                  </Button>
                )} */}
                {isLandscape && (
                  <XMarkIcon className="absolute right-0 aspect-square w-5 rounded-md bg-red-100 p-0.5 text-red-500 hover:text-red-500" />
                )}
              </div>
            </div>
          ) : (
            // ********************* FILE UPLOAD ICON ******************* //
            <div
              className={cn("flex flex-col items-center justify-center text-xs text-muted-foreground", {
                "w-full flex-row items-center justify-between": isLandscape
              })}>
              <div
                className={cn("flex flex-col items-center", {
                  "flex-row gap-2 font-medium": isLandscape
                })}>
                <CloudArrowUpIcon className={cn("mb-2 h-12 w-12", { "m-0 w-8": isLandscape })} />
                <div className="text-muted-foreground">
                  Drag & Drop to Upload - ({formatFileSize(MAX_FILE_SIZE)}) Max.
                </div>
              </div>
              {/* {!isLandscape && (
                // ONLY SHOWS ON THE UPRIGHT COMPONENT
                <div className={cn('mt-3', { 'm-0': isLandscape })}>
                  <Button isDisabled className={'opacity-100'}>
                    Upload
                  </Button>
                </div>
              )} */}
            </div>
          )}

          {/* Remove Image Icon */}
          {imageUrl && !disabled && (
            <div
              className="group absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 transform"
              onClick={(e) => {
                void onChange?.(undefined);
                e.stopPropagation();
              }}>
              <div className="flex h-5 w-5 items-center justify-center rounded-md border border-solid border-red-100 bg-red-50 transition-all duration-300 hover:h-6 hover:w-6 dark:border-red-100 dark:bg-red-50/50">
                <XMarkIcon className="text-red-500" height={16} width={16} />
              </div>
            </div>
          )}
        </div>
        {/* Error Text */}
        {errorMessage && (
          <motion.span
            className={cn("mt-1 ml-1 text-sm text-red-500")}
            whileInView={{
              scale: [0, 1],
              opacity: [0, 1],
              transition: { duration: 0.3 }
            }}>
            {errorMessage}
          </motion.span>
        )}
      </div>
    );
  }
);

type DropZoneProps = {
  dropzoneOptions?: {
    maxSize?: number;
    maxFiles?: number;
    accept?: Record<string, string[]>;
    onDrop?: (acceptedFiles: File[], fileRejections: FileRejection[]) => void;
    onDragEnter?: () => void;
    onDragLeave?: () => void;
    onDragOver?: () => void;
    onDragEnd?: () => void;
    onDropAccepted?: () => void;
    onDropRejected?: () => void;
    [key: string]: any;
  };
  width?: any;
  height?: any;
  value?: any;
  className?: any;
  disabled?: boolean;
  onChange?: (file?: File, imagePreview?: string) => void;
  file?: any;
  acceptableFileTypes?: Record<string, string[] | string>;
  isMultipleFiles?: boolean;
  isLandscape?: boolean;
  isLoading?: boolean;
  showPreview?: boolean;
  isUploaded?: boolean;
  preview?: string;
};

SingleFileDropzone.displayName = "SingleFileDropzone";

function formatFileSize(bytes: any) {
  if (!bytes) {
    return "0 Bytes";
  }
  bytes = Number(bytes);
  if (bytes === 0) {
    return "0 Bytes";
  }
  const k = 1024;
  const dm = 2;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))}${sizes[i]}`;
}

// Helper function to read file bytes
async function readFileBytes(file: File, numBytes: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      resolve(new Uint8Array(arrayBuffer.slice(0, numBytes)));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(0, numBytes));
  });
}

// Helper function to validate file signatures (magic numbers)
function isValidFileSignature(bytes: Uint8Array, mimeType: string): boolean {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  switch (mimeType) {
    case "application/pdf":
      return hex.startsWith("25504446"); // %PDF
    case "image/jpeg":
      return hex.startsWith("ffd8ff"); // JPEG
    case "image/png":
      return hex.startsWith("89504e47"); // PNG
    case "image/webp":
      return hex.startsWith("52494646") && hex.slice(16, 24) === "57454250"; // RIFF...WEBP
    case "application/vnd.ms-excel":
      return hex.startsWith("d0cf11e0") || hex.startsWith("09082100") || hex.startsWith("fdffffff"); // Excel .xls
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return hex.startsWith("504b0304") || hex.startsWith("504b0506") || hex.startsWith("504b0708"); // Excel .xlsx (ZIP-based)
    case "text/csv":
      return true; // CSV files are plain text, no specific magic number
    default:
      return true; // Allow unknown types to pass through
  }
}

export const ACCEPTABLE_FILE_TYPES = {
  pdf: {
    "application/pdf": [".pdf"]
  },
  images: {
    "image/png": [".png"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/webp": [".webp"]
  },
  png: {
    "image/png": [".png"]
  },

  word: {
    "application/msword": [".doc", ".docx"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]
  },

  excel: {
    "text/csv": [".csv"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"]
  },

  powerpoint: {
    "application/vnd.ms-powerpoint": [".ppt", ".pptx"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"]
  }
};
