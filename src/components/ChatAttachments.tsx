'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, X, Download, ZoomIn, Loader2, Paperclip } from 'lucide-react';
import { ChatAttachment } from '@/types/todo';
import { useChatAttachments } from '@/hooks/useChatAttachments';

/**
 * ChatAttachments Components
 * Sprint 3 Issue #25: Chat Image Attachments
 *
 * Components for displaying and uploading chat message attachments.
 *
 * - AttachmentUploadButton: Button to select and upload files
 * - AttachmentPreview: Preview of uploaded attachment before sending
 * - ChatImageGallery: Display images in message
 * - ImageLightbox: Full-screen image viewer
 */

/**
 * Upload button for chat input
 */
export function AttachmentUploadButton({
  onAttachmentSelected,
  disabled = false,
}: {
  onAttachmentSelected: (file: File) => void;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAttachmentSelected(file);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`
          p-2 rounded-lg transition-all
          ${disabled
            ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }
        `}
        title="Attach image"
        aria-label="Attach image"
      >
        <Paperclip className="w-5 h-5" />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </>
  );
}

/**
 * Preview of attachment being uploaded
 */
export function AttachmentPreview({
  file,
  uploading,
  progress,
  error,
  onRemove,
}: {
  file: File;
  uploading: boolean;
  progress: number;
  error?: string | null;
  onRemove: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Generate preview URL
  useState(() => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative inline-block"
    >
      {/* Preview image */}
      <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-blue-500 dark:border-blue-400">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {/* Upload progress overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin mb-1" />
            <span className="text-xs text-white font-medium">{progress}%</span>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 bg-red-500/90 flex items-center justify-center p-2">
            <span className="text-xs text-white text-center">{error}</span>
          </div>
        )}
      </div>

      {/* Remove button */}
      {!uploading && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center shadow-lg transition-colors"
          aria-label="Remove attachment"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* File name */}
      <div className="mt-1 max-w-24">
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
          {file.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          {(file.size / 1024).toFixed(1)} KB
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Display images in a chat message
 */
export function ChatImageGallery({
  attachments,
  onImageClick,
}: {
  attachments: ChatAttachment[];
  onImageClick?: (attachment: ChatAttachment) => void;
}) {
  const { getThumbnailUrl, getAttachmentUrl } = useChatAttachments();

  // Filter to only images
  const images = attachments.filter((a) => a.file_type === 'image');

  if (images.length === 0) return null;

  // Layout based on number of images
  const getGridClass = () => {
    if (images.length === 1) return 'grid-cols-1';
    if (images.length === 2) return 'grid-cols-2';
    if (images.length === 3) return 'grid-cols-3';
    return 'grid-cols-2'; // 4+ images in 2x2 grid
  };

  return (
    <div className={`grid ${getGridClass()} gap-2 mt-2 max-w-md`}>
      {images.map((attachment, index) => {
        // Show max 4 images, with "+N" overlay on 4th if more exist
        if (index >= 4) return null;

        const imageUrl = attachment.thumbnail_path
          ? getThumbnailUrl(attachment.thumbnail_path)
          : getAttachmentUrl(attachment.storage_path);

        const showMoreOverlay = index === 3 && images.length > 4;

        return (
          <motion.button
            key={attachment.id}
            onClick={() => onImageClick?.(attachment)}
            className="relative aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <img
              src={imageUrl}
              alt={attachment.file_name}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {/* Zoom icon on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
              <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* "+N more" overlay */}
            {showMoreOverlay && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  +{images.length - 4}
                </span>
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * Full-screen image lightbox
 */
export function ImageLightbox({
  attachment,
  onClose,
}: {
  attachment: ChatAttachment;
  onClose: () => void;
}) {
  const { getAttachmentUrl } = useChatAttachments();
  const imageUrl = getAttachmentUrl(attachment.storage_path);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="Close lightbox"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Download button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className="absolute top-4 right-16 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="Download image"
        >
          <Download className="w-5 h-5 text-white" />
        </button>

        {/* Image */}
        <motion.img
          src={imageUrl}
          alt={attachment.file_name}
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        />

        {/* File info */}
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <p className="text-white text-sm font-medium">{attachment.file_name}</p>
          <p className="text-white/70 text-xs">
            {(attachment.file_size / 1024).toFixed(1)} KB • Uploaded by {attachment.uploaded_by}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
