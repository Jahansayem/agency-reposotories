import { NextRequest, NextResponse } from 'next/server';

// Audio file transcription endpoint
// Note: This requires OpenAI's Whisper API for file transcription.
// The live microphone feature uses the browser's built-in Web Speech API and doesn't need this endpoint.

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
      return NextResponse.json({
        success: false,
        error: 'Audio file upload is not available. Please use the microphone button to speak your task directly.',
      }, { status: 501 });
    }

    // Use fetch to call OpenAI's Whisper API directly
    const arrayBuffer = await audioFile.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: audioFile.type });

    const whisperFormData = new FormData();
    whisperFormData.append('file', blob, audioFile.name || 'audio.mp3');
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
      console.error('Whisper API error:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to transcribe audio. Please try the microphone button instead.',
      }, { status: 500 });
    }

    const transcription = await response.text();

    return NextResponse.json({
      success: true,
      text: transcription.trim(),
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process audio file. Please use the microphone button instead.' },
      { status: 500 }
    );
  }
}
