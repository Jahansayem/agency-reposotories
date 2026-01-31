'use client';

import { motion } from 'framer-motion';

interface VoiceRecordingIndicatorProps {
  isRecording: boolean;
}

export default function VoiceRecordingIndicator({
  isRecording,
}: VoiceRecordingIndicatorProps) {
  if (!isRecording) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
        'bg-red-50'}`}
    >
      {/* Pulsing red dot */}
      <motion.div
        className="w-2.5 h-2.5 bg-red-500 rounded-full"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [1, 0.7, 1],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Audio waves visualization */}
      <div className="flex items-center gap-0.5 h-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="w-0.5 bg-red-500 rounded-full"
            animate={{
              height: ['8px', '16px', '8px'],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.1,
            }}
          />
        ))}
      </div>

      {/* Text label */}
      <span className={`text-xs font-medium ${'text-red-600'}`}>
        Listening...
      </span>
    </motion.div>
  );
}
