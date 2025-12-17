'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, Check, Trash2, Calendar, Flag, User, FileAudio, Sparkles } from 'lucide-react';
import { TodoPriority } from '@/types/todo';

interface ExtractedTask {
  text: string;
  priority: TodoPriority;
  dueDate: string;
  assignedTo: string;
  selected: boolean;
}

interface ProcessedFile {
  fileName: string;
  transcription: string;
  tasks: ExtractedTask[];
  status: 'pending' | 'transcribing' | 'parsing' | 'ready' | 'error';
  error?: string;
}

interface VoicemailImporterProps {
  onClose: () => void;
  onAddTasks: (tasks: Array<{ text: string; priority: TodoPriority; dueDate?: string; assignedTo?: string }>) => void;
  users: string[];
}

export default function VoicemailImporter({ onClose, onAddTasks, users }: VoicemailImporterProps) {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Filter for audio files
    const audioFiles = selectedFiles.filter(file =>
      file.type.startsWith('audio/') ||
      file.name.match(/\.(mp3|wav|m4a|ogg|webm|aac|flac)$/i)
    );

    if (audioFiles.length === 0) {
      alert('Please select audio files (MP3, WAV, M4A, etc.)');
      return;
    }

    // Add files to the list with pending status
    const newFiles: ProcessedFile[] = audioFiles.map(file => ({
      fileName: file.name,
      transcription: '',
      tasks: [],
      status: 'pending' as const,
    }));

    setFiles(prev => [...prev, ...newFiles]);
    setIsProcessing(true);

    // Process each file
    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      const fileIndex = files.length + i;

      try {
        // Update status to transcribing (now does both transcription + task extraction in one call)
        setFiles(prev => prev.map((f, idx) =>
          idx === fileIndex ? { ...f, status: 'transcribing' as const } : f
        ));

        // Transcribe and extract tasks in a single API call
        const formData = new FormData();
        formData.append('audio', file);
        formData.append('users', JSON.stringify(users));

        const response = await fetch('/api/ai/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to process audio');
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to process audio');
        }

        const transcription = data.text || '';
        const tasks: ExtractedTask[] = (data.tasks || []).map((task: {
          text: string;
          priority: string;
          dueDate: string;
          assignedTo: string;
        }) => ({
          ...task,
          priority: task.priority as TodoPriority,
          selected: true,
        }));

        // Update with transcription and parsed tasks
        setFiles(prev => prev.map((f, idx) =>
          idx === fileIndex ? { ...f, status: 'ready' as const, transcription, tasks } : f
        ));

      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        setFiles(prev => prev.map((f, idx) =>
          idx === fileIndex ? {
            ...f,
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Unknown error'
          } : f
        ));
      }
    }

    setIsProcessing(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleTaskSelection = (fileIndex: number, taskIndex: number) => {
    setFiles(prev => prev.map((file, fi) =>
      fi === fileIndex
        ? {
            ...file,
            tasks: file.tasks.map((task, ti) =>
              ti === taskIndex ? { ...task, selected: !task.selected } : task
            )
          }
        : file
    ));
  };

  const updateTask = (fileIndex: number, taskIndex: number, updates: Partial<ExtractedTask>) => {
    setFiles(prev => prev.map((file, fi) =>
      fi === fileIndex
        ? {
            ...file,
            tasks: file.tasks.map((task, ti) =>
              ti === taskIndex ? { ...task, ...updates } : task
            )
          }
        : file
    ));
  };

  const handleAddSelected = () => {
    const selectedTasks: Array<{ text: string; priority: TodoPriority; dueDate?: string; assignedTo?: string }> = [];

    files.forEach(file => {
      file.tasks.forEach(task => {
        if (task.selected && task.text.trim()) {
          selectedTasks.push({
            text: task.text.trim(),
            priority: task.priority,
            dueDate: task.dueDate || undefined,
            assignedTo: task.assignedTo || undefined,
          });
        }
      });
    });

    if (selectedTasks.length === 0) {
      alert('Please select at least one task to add');
      return;
    }

    onAddTasks(selectedTasks);
    onClose();
  };

  const totalSelectedTasks = files.reduce(
    (acc, file) => acc + file.tasks.filter(t => t.selected).length,
    0
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <FileAudio className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Import Voicemails</h2>
              <p className="text-sm text-slate-500">Upload audio files to extract tasks using AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Upload area */}
          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-purple-400 hover:bg-purple-50/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600 font-medium">Click to upload audio files</p>
            <p className="text-sm text-slate-400 mt-1">MP3, WAV, M4A, OGG (max 25MB each)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2 text-purple-600 bg-purple-50 px-4 py-2 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Processing audio files...</span>
            </div>
          )}

          {/* File list */}
          {files.map((file, fileIndex) => (
            <div key={fileIndex} className="border border-slate-200 rounded-xl overflow-hidden">
              {/* File header */}
              <div className="p-3 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileAudio className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700 text-sm">{file.fileName}</span>
                  {(file.status === 'transcribing' || file.status === 'parsing') && (
                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Processing...
                    </span>
                  )}
                  {file.status === 'ready' && (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> {file.tasks.length} task{file.tasks.length !== 1 ? 's' : ''} found
                    </span>
                  )}
                  {file.status === 'error' && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      Error: {file.error}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeFile(fileIndex)}
                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Transcription preview */}
              {file.transcription && (
                <div className="px-3 py-2 bg-slate-50/50 border-b border-slate-100">
                  <p className="text-xs text-slate-500 italic line-clamp-2">&ldquo;{file.transcription}&rdquo;</p>
                </div>
              )}

              {/* Tasks list */}
              {file.tasks.length > 0 && (
                <div className="p-3 space-y-2">
                  {file.tasks.map((task, taskIndex) => (
                    <div
                      key={taskIndex}
                      className={`p-3 rounded-lg border transition-colors ${
                        task.selected
                          ? 'border-purple-200 bg-purple-50/50'
                          : 'border-slate-200 bg-slate-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleTaskSelection(fileIndex, taskIndex)}
                          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            task.selected
                              ? 'bg-purple-500 border-purple-500 text-white'
                              : 'border-slate-300'
                          }`}
                        >
                          {task.selected && <Check className="w-3 h-3" />}
                        </button>

                        <div className="flex-1 space-y-2">
                          {/* Task text */}
                          <input
                            type="text"
                            value={task.text}
                            onChange={(e) => updateTask(fileIndex, taskIndex, { text: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                          />

                          {/* Task options */}
                          <div className="flex items-center gap-3 flex-wrap">
                            {/* Priority */}
                            <div className="flex items-center gap-1">
                              <Flag className="w-3 h-3 text-slate-400" />
                              <select
                                value={task.priority}
                                onChange={(e) => updateTask(fileIndex, taskIndex, { priority: e.target.value as TodoPriority })}
                                className="text-xs px-2 py-1 rounded border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                              </select>
                            </div>

                            {/* Due date */}
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <input
                                type="date"
                                value={task.dueDate}
                                onChange={(e) => updateTask(fileIndex, taskIndex, { dueDate: e.target.value })}
                                className="text-xs px-2 py-1 rounded border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
                              />
                            </div>

                            {/* Assignee */}
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <select
                                value={task.assignedTo}
                                onChange={(e) => updateTask(fileIndex, taskIndex, { assignedTo: e.target.value })}
                                className="text-xs px-2 py-1 rounded border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
                              >
                                <option value="">Unassigned</option>
                                {users.map(user => (
                                  <option key={user} value={user}>{user}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Empty state */}
          {files.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <FileAudio className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No audio files uploaded yet</p>
              <p className="text-sm mt-1">Upload voicemails to extract tasks automatically</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {totalSelectedTasks} task{totalSelectedTasks !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSelected}
              disabled={totalSelectedTasks === 0 || isProcessing}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Add {totalSelectedTasks} Task{totalSelectedTasks !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
