"use client";
import React, { JSX } from "react";

interface EditorJsBlock {
  type: string;
  data: {
    text?: string;
    level?: number;
    items?: any;
    style?: "ordered" | "unordered";
  };
}

interface RichTextRendererProps {
  data?: {
    blocks?: EditorJsBlock[];
  };
  className?: string;
}

export function RichTextRenderer({
  data,
  className = "",
}: RichTextRendererProps) {
  if (!data?.blocks) return null;

  const decodeHtmlEntities = (text: string) => {
    if (!text) return "";
    return String(text)
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  };

  const renderText = (text: string) => {
    const decodedText = decodeHtmlEntities(text || "");
    if (!decodedText.trim()) return null;

    const elements: React.ReactNode[] = [];
    let remainingText = decodedText;

    while (remainingText.length > 0) {
      const boldMatch = remainingText.match(/\*\*(.*?)\*\*/);
      if (boldMatch) {
        const [fullMatch, boldContent] = boldMatch;
        const splitIndex = remainingText.indexOf(fullMatch);

        if (splitIndex > 0) {
          elements.push(remainingText.substring(0, splitIndex));
        }

        elements.push(
          <strong key={elements.length} className="font-semibold">
            {boldContent}
          </strong>
        );
        remainingText = remainingText.substring(splitIndex + fullMatch.length);
        continue;
      }

      const italicMatch = remainingText.match(/_(.*?)_/);
      if (italicMatch) {
        const [fullMatch, italicContent] = italicMatch;
        const splitIndex = remainingText.indexOf(fullMatch);

        if (splitIndex > 0) {
          elements.push(remainingText.substring(0, splitIndex));
        }

        elements.push(
          <em key={elements.length} className="italic">
            {italicContent}
          </em>
        );
        remainingText = remainingText.substring(splitIndex + fullMatch.length);
        continue;
      }

      elements.push(remainingText);
      remainingText = "";
    }

    return elements.length > 0 ? elements : null;
  };

  return (
    <div className={`prose max-w-none ${className}`}>
      {data.blocks.map((block, index) => {
        const key = `${block.type}-${index}`;

        switch (block.type) {
          case "header":
            const level = block.data.level || 2;
            const HeaderTag = `h${level}` as keyof JSX.IntrinsicElements;

            return (
              <HeaderTag
                key={key}
                className={`
                  font-bold text-gray-900 dark:text-slate-100 mb-2
                  ${
                    level === 2
                      ? "text-3xl border-b pb-2 border-border"
                      : ""
                  }
                  ${level === 3 ? "text-2xl" : ""}
                  ${level >= 4 ? "text-xl" : ""}\
                `}
              >
                {renderText(block.data.text || "")}
              </HeaderTag>
            );

          case "paragraph":
            const paragraphContent = renderText(block.data.text || "");
            if (!paragraphContent) return null;

            return (
              <p
                key={key}
                className="my-4 text-[clamp(12px,12px+0.35vw,1rem)] text-gray-700 dark:text-slate-300 leading-relaxed"
              >
                {paragraphContent}
              </p>
            );

          case "list":
            const ListTag = block.data.style === "ordered" ? "ol" : "ul";
            const validItems = block.data.items
              ?.map((item: any) => decodeHtmlEntities(item?.content || ""))
              ?.filter((item: string) => item.trim());

            if (!validItems?.length) return null;

            return (
              <ListTag
                key={key}
                className={`
                  my-4 pl-6 text-[clamp(12px,12px+0.35vw,1rem)]
                  ${
                    block.data.style === "ordered"
                      ? "list-decimal"
                      : "list-disc"
                  }
                `}
              >
                {validItems.map((item: string, itemIndex: number) => {
                  const itemContent = renderText(item);

                  if (!itemContent) return null;

                  return (
                    <li
                      key={`${key}-${itemIndex}`}
                      className="mb-1 text-gray-700 dark:text-slate-300 text-[clamp(12px,12px+0.35vw,1rem)]"
                    >
                      {itemContent}
                    </li>
                  );
                })}
              </ListTag>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
