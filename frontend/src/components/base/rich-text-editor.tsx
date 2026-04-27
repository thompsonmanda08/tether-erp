'use client'

import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import React from 'react'

interface RichTextEditorProps {
  initialData?: string
  placeholder?: string
  onSave: (data: string) => Promise<void>
  onCancel: () => void
  isSaving?: boolean
  className?: string
  classNames?: {
    wrapper?: string
    editor?: string
  }
}

export function RichTextEditor({
  initialData = '',
  placeholder = 'Write your content here...',
  onSave,
  onCancel,
  isSaving = false,
  className,
  classNames,
}: RichTextEditorProps) {
  const [content, setContent] = React.useState(initialData)

  const handleSave = async () => {
    await onSave(content)
  }

  return (
    <div className={classNames?.wrapper || className}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className={`${classNames?.editor || ''} min-h-96`}
      />
      <div className="flex gap-2 mt-4">
        <Button onClick={handleSave} disabled={isSaving} isLoading={isSaving} loadingText="Saving...">
          Save
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
