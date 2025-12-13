import { NextRequest, NextResponse } from 'next/server';

// Audio file transcription endpoint
// Note: This requires OpenAI's Whisper API for file transcription.
// The live microphone feature uses the browser's built-in Web Speech API and doesn't need this endpoint.

// Supported audio formats by OpenAI Whisper
const SUPPORTED_FORMATS = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'ogg', 'flac'];

function getFileExtension(filename: string, mimeType: string): string {
  // Try to get extension from filename first
  const fromName = filename.split('.').pop()?.toLowerCase();
  if (fromName && SUPPORTED_FORMATS.includes(fromName)) {
    return fromName;
  }

  // Fallback to mime type mapping
  const mimeMap: Record<string, string> = {
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'mp4',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/x-wav': 'wav',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
    'audio/x-flac': 'flac',
  };

  return mimeMap[mimeType] || 'mp3';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log('Received audio file:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    });

    // Check file size (limit to 25MB)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    // For audio file transcription, we need OpenAI's Whisper API
    // If OPENAI_API_KEY is not configured, suggest using the mic button instead
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return NextResponse.json({
        success: false,
        error: 'Audio file upload is not available. Please use the microphone button to speak your task directly.',
      }, { status: 501 });
    }

    // Get the proper file extension
    const extension = getFileExtension(audioFile.name, audioFile.type);
    const fileName = `audio.${extension}`;

    console.log('Sending to Whisper API with filename:', fileName);

    // Use fetch to call OpenAI's Whisper API directly
    const arrayBuffer = await audioFile.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: audioFile.type || `audio/${extension}` });

    const whisperFormData = new FormData();
    whisperFormData.append('file', blob, fileName);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('response_format', 'text');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: whisperFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Whisper API error:', response.status, errorText);

      // Parse error for better user message
      let userError = 'Failed to transcribe audio.';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          userError = errorJson.error.message;
        }
      } catch {
        // Use default message
      }

      return NextResponse.json({
        success: false,
        error: userError,
      }, { status: 500 });
    }

    const transcription = await response.text();
    console.log('Transcription successful, length:', transcription.length);

    return NextResponse.json({
      success: true,
      text: transcription.trim(),
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process audio file. Please try again.' },
      { status: 500 }
    );
  }
}
