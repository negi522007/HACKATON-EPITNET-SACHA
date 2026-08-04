let recognition: SpeechRecognition | null = null;
let analyser: AnalyserNode | null = null;
let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;

export function getSpeechRecognition(onResult: (text: string, isFinal: boolean) => void, onEnd: () => void, onError: (e: string) => void, lang = 'fr-FR'): SpeechRecognition | null {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let interimTranscript = '';
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    if (finalTranscript) onResult(finalTranscript, true);
    else if (interimTranscript) onResult(interimTranscript, false);
  };

  recognition.onend = onEnd;
  recognition.onerror = (event) => {
    onError(event.error);
    onEnd();
  };

  return recognition;
}

export async function startAudioAnalysis(): Promise<AnalyserNode | null> {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(mediaStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    return analyser;
  } catch {
    return null;
  }
}

export function getAudioLevel(analyserNode: AnalyserNode): number {
  const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
  analyserNode.getByteFrequencyData(dataArray);
  const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
  return avg / 255;
}

export function stopAudioAnalysis() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  analyser = null;
}

export function stopSpeechRecognition() {
  if (recognition) {
    try { recognition.stop(); } catch {}
    recognition = null;
  }
}