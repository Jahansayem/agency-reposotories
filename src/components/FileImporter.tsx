'use client';

import { useState, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import {
  X,
  Loader2,
  Check,
  FileAudio,
  FileText,
  Sparkles,
  Trash2,
  Flag,
  Clock,
  Upload,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Plus,
  Calendar,
  User,
  AlertCircle,
  File,
  Circle,
  CheckCircle2,
  XCircle,
  Wand2,
} from 'lucide-react';
import { Subtask, TodoPriority, PRIORITY_CONFIG } from '@/types/todo';
import { fetchWithCsrf } from '@/lib/csrf';
import { v4 as uuidv4 } from 'uuid';

interface ParsedSubtask {
  text: string;
  priority: TodoPriority;
  estimatedMinutes?: number;
  selected: boolean;
}

interface FileImporterProps {
  onClose: () => void;
  onCreateTask: (
    text: string,
    priority: TodoPriority,
    dueDate?: string,
    assignedTo?: string,
    subtasks?: Subtask[],
    transcription?: string,
    sourceFile?: File
  ) => void;
  users: string[];
  initialFile?: File | null;
}

type FileType = 'audio' | 'pdf' | 'image' | 'unknown';
type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'parsing' | 'ready' | 'error';

// Processing steps for the progress modal
type ProcessingStep = {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
};

const getProcessingSteps = (fileType: FileType): ProcessingStep[] => {
  if (fileType === 'audio') {
    return [
      { id: 'upload', label: 'Uploading', description: 'Sending audio to server', status: 'pending' },
      { id: 'transcribe', label: 'Transcribing', description: 'Converting speech to text with AI', status: 'pending' },
      { id: 'analyze', label: 'Analyzing', description: 'Understanding context and intent', status: 'pending' },
      { id: 'extract', label: 'Extracting Tasks', description: 'Identifying action items', status: 'pending' },
    ];
  }
  return [
    { id: 'upload', label: 'Uploading', description: 'Sending file to server', status: 'pending' },
    { id: 'read', label: 'Reading', description: fileType === 'pdf' ? 'Extracting text from PDF' : 'Analyzing image content', status: 'pending' },
    { id: 'analyze', label: 'Analyzing', description: 'Understanding document context', status: 'pending' },
    { id: 'extract', label: 'Extracting Tasks', description: 'Identifying action items', status: 'pending' },
  ];
};

function getFileType(file: File): FileType {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (type.startsWith('audio/') || name.match(/\.(mp3|mp4|mpeg|mpga|m4a|wav|webm|ogg|aac|flac)$/)) {
    return 'audio';
  }
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return 'pdf';
  }
  if (type.startsWith('image/') || name.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    return 'image';
  }
  return 'unknown';
}

function getFileIcon(fileType: FileType) {
  switch (fileType) {
    case 'audio':
      return FileAudio;
    case 'pdf':
    case 'image':
      return FileText;
    default:
      return File;
  }
}

export default function FileImporter({
  onClose,
  onCreateTask,
  users,
  initialFile = null,
}: FileImporterProps) {
  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>('unknown');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialFileProcessed = useRef(false);

  // Handle initial file from drag-and-drop
  useEffect(() => {
    if (initialFile && !initialFileProcessed.current) {
      initialFileProcessed.current = true;
      handleFileSelect(initialFile);
    }
  }, [initialFile]);

  // Processing state
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [showFullText, setShowFullText] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);

  // Helper to update a specific step's status
  const updateStepStatus = (stepId: string, stepStatus: ProcessingStep['status']) => {
    setProcessingSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, status: stepStatus } : step
    ));
  };

  // Helper to advance to the next step
  const advanceToStep = (stepId: string) => {
    setProcessingSteps(prev => {
      const stepIndex = prev.findIndex(s => s.id === stepId);
      return prev.map((step, i) => {
        if (i < stepIndex) return { ...step, status: 'completed' as const };
        if (i === stepIndex) return { ...step, status: 'active' as const };
        return step;
      });
    });
  };

  // Mark all steps as completed
  const completeAllSteps = () => {
    setProcessingSteps(prev => prev.map(step => ({ ...step, status: 'completed' as const })));
  };

  // Parsed task state
  const [mainTask, setMainTask] = useState({
    text: '',
    priority: 'medium' as TodoPriority,
    dueDate: '',
    assignedTo: '',
  });
  const [subtasks, setSubtasks] = useState<ParsedSubtask[]>([]);
  const [summary, setSummary] = useState('');

  // Handle file selection
  const handleFileSelect = (file: File) => {
    const type = getFileType(file);

    if (type === 'unknown') {
      setError('Please select an audio file (MP3, WAV, etc.), PDF, or image');
      return;
    }

    // Validate file size (25MB max)
    if (file.size > 25 * 1024 * 1024) {
      setError('File size must be under 25MB');
      return;
    }

    setSelectedFile(file);
    setFileType(type);
    setError('');

    // Create audio URL for playback if audio file
    if (type === 'audio') {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Toggle audio playback
  const togglePlayback = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        logger.error('Failed to play audio', err, { component: 'FileImporter' });
        setError('Unable to play audio. Please try again.');
      }
    }
  };

  // Process the file - different paths for audio vs PDF/image
  const processFile = async () => {
    if (!selectedFile) return;

    // Initialize processing steps
    const steps = getProcessingSteps(fileType);
    setProcessingSteps(steps);
    setStatus('processing');
    setError('');

    // Start with upload step
    advanceToStep('upload');
    // Small delay to show upload step
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      if (fileType === 'audio') {
        // Audio: Transcribe first, then parse
        const formData = new FormData();
        formData.append('audio', selectedFile);
        formData.append('users', JSON.stringify(users));

        // Move to transcribe step
        advanceToStep('transcribe');

        const response = await fetchWithCsrf('/api/ai/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          // Check for session/auth errors
          if (response.status === 401 || errorData.error?.includes('session')) {
            throw new Error('Your session has expired. Please refresh the page and log in again.');
          }
          throw new Error(errorData.error || 'Failed to transcribe audio');
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to transcribe audio');
        }

        const transcript = data.text || '';
        setExtractedText(transcript);

        // Move to analyze step
        advanceToStep('analyze');
        await new Promise(resolve => setTimeout(resolve, 200));

        // Parse the transcript
        setStatus('parsing');
        advanceToStep('extract');

        const parseResponse = await fetchWithCsrf('/api/ai/smart-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: transcript, users }),
        });

        if (parseResponse.ok) {
          const parseData = await parseResponse.json();
          if (parseData.success && parseData.result) {
            applyParseResult(parseData.result, transcript);
          } else {
            // Fallback
            setMainTask({
              text: transcript.slice(0, 200),
              priority: 'medium',
              dueDate: '',
              assignedTo: '',
            });
          }
        } else {
          // Fallback on error - use transcript as main task
          logger.warn('Smart parse failed, using transcript as task', { component: 'FileImporter' });
          setMainTask({
            text: transcript.slice(0, 200),
            priority: 'medium',
            dueDate: '',
            assignedTo: '',
          });
        }
      } else {
        // PDF/Image: Use vision API to read and parse
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('users', JSON.stringify(users));

        // Move to read step
        advanceToStep('read');

        const response = await fetchWithCsrf('/api/ai/parse-file', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          // Check for session/auth errors
          if (response.status === 401 || errorData.error?.includes('session')) {
            throw new Error('Your session has expired. Please refresh the page and log in again.');
          }
          throw new Error(errorData.error || 'Failed to process file');
        }

        // Move to analyze step
        advanceToStep('analyze');

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to process file');
        }

        setExtractedText(data.extractedText || '');
        setSummary(data.documentSummary || '');

        // Move to extract step
        advanceToStep('extract');
        await new Promise(resolve => setTimeout(resolve, 200));

        // Apply parsed results
        setMainTask({
          text: data.mainTask?.text || '',
          priority: data.mainTask?.priority || 'medium',
          dueDate: data.mainTask?.dueDate || '',
          assignedTo: data.mainTask?.assignedTo || '',
        });

        if (data.subtasks && data.subtasks.length > 0) {
          const parsedSubtasks: ParsedSubtask[] = data.subtasks.map((st: {
            text: string;
            priority: string;
            estimatedMinutes?: number;
          }) => ({
            text: st.text,
            priority: st.priority as TodoPriority,
            estimatedMinutes: st.estimatedMinutes,
            selected: true,
          }));
          setSubtasks(parsedSubtasks);
        }
      }

      // Complete all steps
      completeAllSteps();
      await new Promise(resolve => setTimeout(resolve, 300));
      setStatus('ready');
    } catch (err) {
      // Mark current step as error
      const currentStep = processingSteps.find(s => s.status === 'active');
      if (currentStep) {
        updateStepStatus(currentStep.id, 'error');
      }
      setError(err instanceof Error ? err.message : 'Failed to process file');
      setStatus('error');
    }
  };

  const applyParseResult = (result: {
    mainTask: { text: string; priority: string; dueDate: string; assignedTo: string };
    subtasks: { text: string; priority: string; estimatedMinutes?: number }[];
    summary?: string;
  }, fallbackText: string) => {
    setMainTask({
      text: result.mainTask.text || fallbackText.slice(0, 200),
      priority: (result.mainTask.priority as TodoPriority) || 'medium',
      dueDate: result.mainTask.dueDate || '',
      assignedTo: result.mainTask.assignedTo || '',
    });

    if (result.subtasks && result.subtasks.length > 0) {
      const parsedSubtasks: ParsedSubtask[] = result.subtasks.map((st) => ({
        text: st.text,
        priority: st.priority as TodoPriority,
        estimatedMinutes: st.estimatedMinutes,
        selected: true,
      }));
      setSubtasks(parsedSubtasks);
    }

    setSummary(result.summary || '');
  };

  // Subtask management
  const toggleSubtask = (index: number) => {
    setSubtasks(prev => prev.map((st, i) =>
      i === index ? { ...st, selected: !st.selected } : st
    ));
  };

  const updateSubtask = (index: number, updates: Partial<ParsedSubtask>) => {
    setSubtasks(prev => prev.map((st, i) =>
      i === index ? { ...st, ...updates } : st
    ));
  };

  const removeSubtask = (index: number) => {
    setSubtasks(prev => prev.filter((_, i) => i !== index));
  };

  const addSubtask = () => {
    setSubtasks(prev => [...prev, {
      text: '',
      priority: 'medium',
      selected: true,
    }]);
  };

  // Create the task
  const handleCreate = () => {
    if (!mainTask.text.trim()) {
      setError('Please enter a task description');
      return;
    }

    const selectedSubtasks: Subtask[] = subtasks
      .filter(st => st.selected && st.text.trim())
      .map(st => ({
        id: uuidv4(),
        text: st.text.trim(),
        completed: false,
        priority: st.priority,
        estimatedMinutes: st.estimatedMinutes,
      }));

    // Pass transcription only for audio files
    const transcription = fileType === 'audio' && extractedText ? extractedText : undefined;

    // Pass the source file for auto-attachment
    onCreateTask(
      mainTask.text.trim(),
      mainTask.priority,
      mainTask.dueDate || undefined,
      mainTask.assignedTo || undefined,
      selectedSubtasks.length > 0 ? selectedSubtasks : undefined,
      transcription,
      selectedFile || undefined
    );

    onClose();
  };

  // Clear and start over
  const handleClear = () => {
    setSelectedFile(null);
    setFileType('unknown');
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setExtractedText('');
    setMainTask({ text: '', priority: 'medium', dueDate: '', assignedTo: '' });
    setSubtasks([]);
    setSummary('');
    setStatus('idle');
    setError('');
  };

  const totalSelected = subtasks.filter(st => st.selected).length;
  const priorityConfig = PRIORITY_CONFIG[mainTask.priority];
  const FileIcon = getFileIcon(fileType);

  const getButtonText = () => {
    if (fileType === 'audio') {
      return 'Transcribe & Extract Tasks';
    }
    return 'Read & Extract Tasks';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="rounded-[var(--radius-2xl)] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden bg-[var(--surface)]">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--accent)]/10">
              <FileIcon className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Import File</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Upload a voicemail, PDF, or image to create a task
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[var(--radius-lg)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Upload area - shown when no file selected */}
          {status === 'idle' && !selectedFile && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-[var(--radius-xl)] p-12 text-center transition-all cursor-pointer
                ${isDragging
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                  : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5'}`}
            >
              <Upload className={`w-12 h-12 mx-auto mb-4 transition-colors ${isDragging ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} aria-hidden="true" />
              <p className="font-medium text-lg text-[var(--foreground)]">
                {isDragging ? 'Drop your file here' : 'Drop your file here'}
              </p>
              <p className="mt-2 text-[var(--text-secondary)]">or click to browse</p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                <span className="px-3 py-1 rounded-full text-sm flex items-center gap-1 bg-[var(--accent)]/10 text-[var(--accent)]">
                  <FileAudio className="w-4 h-4" aria-hidden="true" />
                  Audio
                </span>
                <span className="px-3 py-1 rounded-full text-sm flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  PDF
                </span>
                <span className="px-3 py-1 rounded-full text-sm flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  <File className="w-4 h-4" aria-hidden="true" />
                  Image
                </span>
              </div>
              <p className="text-sm mt-3 text-[var(--text-muted)]">
                Max 25MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.pdf,image/*"
                onChange={handleInputChange}
                className="hidden"
              />
            </div>
          )}

          {/* File selected - show preview and process button */}
          {status === 'idle' && selectedFile && (
            <div className="space-y-4">
              {/* File preview */}
              <div className="p-4 rounded-[var(--radius-xl)] bg-[var(--surface-2)]">
                <div className="flex items-center gap-4">
                  {fileType === 'audio' ? (
                    <button
                      onClick={togglePlayback}
                      className="w-12 h-12 rounded-full bg-[var(--accent)] hover:bg-[var(--brand-navy)]
                               text-white flex items-center justify-center transition-colors"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                  ) : (
                    <div className={`w-12 h-12 rounded-[var(--radius-xl)] flex items-center justify-center
                                  ${fileType === 'pdf'
                                    ? 'bg-red-100 dark:bg-red-900/30': 'bg-blue-100 dark:bg-blue-900/30'}`}>
                      <FileIcon className={`w-6 h-6 ${fileType === 'pdf' ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'}`} aria-hidden="true" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-[var(--foreground)]">{selectedFile.name}</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB •{' '}
                      {fileType === 'audio' ? 'Audio' : fileType === 'pdf' ? 'PDF' : 'Image'}
                    </p>
                  </div>
                  <button
                    onClick={handleClear}
                    className="p-2 transition-colors text-[var(--text-muted)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-[var(--radius-lg)]"
                    aria-label="Remove file"
                  >
                    <Trash2 className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
                {audioUrl && (
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                )}
              </div>

              {/* Process button */}
              <button
                onClick={processFile}
                className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--brand-navy)] text-white rounded-[var(--radius-xl)]
                         font-medium transition-colors flex items-center justify-center gap-2 text-lg"
              >
                <Sparkles className="w-5 h-5" />
                {getButtonText()}
              </button>
            </div>
          )}

          {/* Processing state - Step by Step Progress */}
          {(status === 'processing' || status === 'parsing') && (
            <div className="py-8 px-4">
              {/* Header with icon */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-[var(--radius-2xl)] mx-auto mb-4 flex items-center justify-center bg-[var(--accent)]/10">
                  <Wand2 className="w-8 h-8 text-[var(--accent)] animate-pulse" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">
                  AI is processing your file
                </h3>
                <p className="text-sm mt-1 text-[var(--text-secondary)]">
                  This usually takes 10-30 seconds
                </p>
              </div>

              {/* Steps */}
              <div className="max-w-sm mx-auto space-y-4">
                {processingSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-4 p-3 rounded-[var(--radius-xl)] transition-all ${
                      step.status === 'active'
                        ? 'bg-[var(--accent)]/5 ring-2 ring-[var(--accent)]/30': step.status === 'completed'
                          ? 'bg-green-50 dark:bg-green-900/20': step.status === 'error'
                            ? 'bg-red-50 dark:bg-red-900/20': 'bg-[var(--surface-2)]'}`}
                  >
                    {/* Step indicator */}
                    <div className="flex-shrink-0">
                      {step.status === 'completed' ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      ) : step.status === 'active' ? (
                        <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
                      ) : step.status === 'error' ? (
                        <XCircle className="w-6 h-6 text-red-500" />
                      ) : (
                        <Circle className="w-6 h-6 text-[var(--text-muted)]" aria-hidden="true" />
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${
                        step.status === 'active'
                          ? 'text-[var(--accent)]'
                          : step.status === 'completed'
                            ? 'text-green-700 dark:text-green-400': step.status === 'error'
                              ? 'text-red-500 dark:text-red-400'
                              : 'text-[var(--text-secondary)]'}`}>
                        {step.label}
                      </p>
                      <p className={`text-sm ${
                        step.status === 'active'
                          ? 'text-[var(--accent)]': 'text-[var(--text-muted)]'}`}>
                        {step.description}
                      </p>
                    </div>

                    {/* Step number */}
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.status === 'completed'
                        ? 'bg-green-500 text-white'
                        : step.status === 'active'
                          ? 'bg-[var(--accent)]/50 text-white'
                          : step.status === 'error'
                            ? 'bg-red-500 text-white'
                            : 'bg-[var(--surface-3)] text-[var(--text-secondary)]'}`}>
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>

              {/* Helpful tip */}
              <p className="text-center text-xs mt-6 flex items-center justify-center gap-1.5 text-[var(--text-muted)]">
                <Sparkles className="w-3.5 h-3.5 text-[var(--brand-sky)]" aria-hidden="true" />
                AI is analyzing your content and extracting actionable tasks
              </p>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="space-y-4">
              <div className="p-4 border rounded-[var(--radius-xl)] flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">Error processing file</p>
                  <p className="text-sm mt-1 text-red-600 dark:text-red-300">{error}</p>
                </div>
              </div>
              <button
                onClick={handleClear}
                className="w-full py-3 rounded-[var(--radius-xl)] font-medium transition-colors bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Results view */}
          {status === 'ready' && (
            <div className="space-y-6">
              {/* Extracted text/transcript section */}
              {extractedText && (
                <div className="p-4 rounded-[var(--radius-xl)] bg-[var(--surface-2)]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-[var(--text-secondary)]">
                      {fileType === 'audio' ? 'Transcript' : 'Extracted Content'}
                    </p>
                    <button
                      onClick={() => setShowFullText(!showFullText)}
                      className="text-sm text-[var(--accent)] hover:text-[var(--brand-sky)] flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-[var(--radius-md)]"
                    >
                      {showFullText ? 'Show less' : 'Show more'}
                      {showFullText ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                  <p className={`text-sm italic ${showFullText ? '' : 'line-clamp-3'} text-[var(--text-secondary)]`}>
                    &ldquo;{extractedText}&rdquo;
                  </p>
                </div>
              )}

              {/* Summary */}
              {summary && (
                <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--accent)]/5">
                  <p className="text-sm text-[var(--accent)]">{summary}</p>
                </div>
              )}

              {/* Main task editor */}
              <div className="space-y-4">
                <h3 className="font-medium text-[var(--foreground)]">Main Task</h3>

                <input
                  type="text"
                  value={mainTask.text}
                  onChange={(e) => setMainTask(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Task description..."
                  className="w-full px-4 py-3 border rounded-[var(--radius-xl)]
                           focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]
                           bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)] placeholder-[var(--text-muted)]"
                />

                <div className="flex flex-wrap gap-3">
                  {/* Priority */}
                  <div className="relative">
                    <select
                      value={mainTask.priority}
                      onChange={(e) => setMainTask(prev => ({ ...prev, priority: e.target.value as TodoPriority }))}
                      className="appearance-none pl-8 pr-8 py-2 rounded-[var(--radius-lg)] text-sm font-medium cursor-pointer
                               focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 border border-[var(--border)]"
                      style={{ backgroundColor: priorityConfig.bgColor, color: priorityConfig.color }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <Flag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                          style={{ color: priorityConfig.color }} aria-hidden="true" />
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-50" aria-hidden="true" />
                  </div>

                  {/* Due date */}
                  <div className="relative">
                    <input
                      type="date"
                      value={mainTask.dueDate}
                      onChange={(e) => setMainTask(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="pl-8 pr-3 py-2 rounded-[var(--radius-lg)] text-sm border
                               focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30
                               bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)]"
                    />
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-muted)]" aria-hidden="true" />
                  </div>

                  {/* Assignee */}
                  <div className="relative">
                    <select
                      value={mainTask.assignedTo}
                      onChange={(e) => setMainTask(prev => ({ ...prev, assignedTo: e.target.value }))}
                      className="appearance-none pl-8 pr-8 py-2 rounded-[var(--radius-lg)] text-sm border
                               focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30
                               bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)]"
                    >
                      <option value="">Unassigned</option>
                      {users.map((user) => (
                        <option key={user} value={user}>{user}</option>
                      ))}
                    </select>
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-muted)]" aria-hidden="true" />
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-50" aria-hidden="true" />
                  </div>
                </div>
              </div>

              {/* Subtasks section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-[var(--foreground)]">
                    Subtasks {subtasks.length > 0 && <span className="text-[var(--text-muted)]">({totalSelected} selected)</span>}
                  </h3>
                  <button
                    onClick={addSubtask}
                    className="text-sm text-[var(--accent)] hover:text-[var(--brand-sky)] flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-[var(--radius-md)]"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    Add subtask
                  </button>
                </div>

                {subtasks.length === 0 ? (
                  <p className="text-sm py-4 text-center text-[var(--text-muted)]">
                    No subtasks extracted. Click &ldquo;Add subtask&rdquo; to create one manually.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {subtasks.map((subtask, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-[var(--radius-lg)] border transition-colors ${
                          subtask.selected
                            ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5': 'border-[var(--border)] bg-[var(--surface-2)] opacity-60'}`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleSubtask(index)}
                            className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                              subtask.selected
                                ? 'bg-[var(--accent)]/50 border-[var(--accent)] text-white'
                                : 'border-[var(--border)]'}`}
                            aria-label={subtask.selected ? 'Deselect subtask' : 'Select subtask'}
                          >
                            {subtask.selected && <Check className="w-3 h-3" aria-hidden="true" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={subtask.text}
                              onChange={(e) => updateSubtask(index, { text: e.target.value })}
                              placeholder="Subtask description..."
                              className="w-full border rounded-[var(--radius-lg)] px-3 py-1.5 text-sm
                                       focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]
                                       bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)] placeholder-[var(--text-muted)]"
                            />

                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <div className="flex items-center gap-1">
                                <Flag className="w-3 h-3 text-[var(--text-muted)]" aria-hidden="true" />
                                <select
                                  value={subtask.priority}
                                  onChange={(e) => updateSubtask(index, { priority: e.target.value as TodoPriority })}
                                  className="text-xs px-2 py-1 rounded border
                                           focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30
                                           bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)]"
                                >
                                  <option value="low">Low</option>
                                  <option value="medium">Medium</option>
                                  <option value="high">High</option>
                                  <option value="urgent">Urgent</option>
                                </select>
                              </div>

                              {subtask.estimatedMinutes && (
                                <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                                  <Clock className="w-3 h-3" aria-hidden="true" />
                                  {subtask.estimatedMinutes}m
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => removeSubtask(index)}
                            className="p-1 transition-colors text-[var(--text-muted)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-[var(--radius-md)]"
                            aria-label="Remove subtask"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* General error display */}
          {error && status !== 'error' && (
            <div className="mt-4 p-3 border rounded-[var(--radius-lg)] text-sm bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        {status === 'ready' && (
          <div className="p-4 border-t border-[var(--border)] flex items-center justify-between flex-shrink-0">
            <button
              onClick={handleClear}
              className="text-sm transition-colors text-[var(--text-secondary)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-[var(--radius-md)]"
            >
              Start over
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-[var(--radius-lg)] font-medium transition-colors text-[var(--text-secondary)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!mainTask.text.trim()}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--brand-navy)] rounded-[var(--radius-lg)] font-medium transition-colors
                         disabled:cursor-not-allowed flex items-center gap-2
                         text-white disabled:bg-[var(--surface-3)] disabled:text-[var(--text-muted)]
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                Create Task
                {totalSelected > 0 && ` with ${totalSelected} Subtask${totalSelected !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
