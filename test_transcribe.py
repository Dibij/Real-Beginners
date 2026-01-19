from faster_whisper import WhisperModel
import os

def transcribe_audio_local(file_path):
    # Check if file exists
    if not os.path.exists(file_path):
        print(f"❌ Error: File not found at {file_path}")
        return

    print(f"📖 Reading audio file: {file_path}")
    print("🚀 Loading faster-whisper model ('tiny')...")
    
    try:
        # Load the model once (tiny, CPU, int8)
        model = WhisperModel("tiny", device="cpu", compute_type="int8")
        
        print("🎙️ Transcribing...")
        # Transcribe the audio
        segments, info = model.transcribe(file_path)
        
        # Combine segments into a single text
        text = " ".join([seg.text for seg in segments])
        
        print("\n✨ Transcription Successful!")
        print("----------------------------")
        print(text if text.strip() else "[No text detected in audio]")
        print("----------------------------\n")
        
        print(f"Detected language: {info.language} with probability {info.language_probability:.2f}")

    except Exception as e:
        print(f"❌ Transcription failed: {e}")

if __name__ == "__main__":
    # Path to the recording you specified
    audio_path = r"backend\media\audio_notes\recording_0.webm"
    transcribe_audio_local(audio_path)
