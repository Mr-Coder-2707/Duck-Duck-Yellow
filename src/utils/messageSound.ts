/**
 * Message notification sound management
 * Uses real WAV file for WhatsApp-style notification
 */

// Try to use real audio file first, fallback to synthesized sound
export const playMessageNotificationSound = async () => {
  // First try to play the real WAV file
  const success = await playMessageSoundFromFile('/sound/duckquack.wav');
  
  // If file fails to load or play, fallback to synthesized sound
  if (!success) {
    await playMessageNotificationSoundSynthesized();
  }
};

/**
 * Play message sound from external audio file
 * Returns true if successful, false if failed
 */
export const playMessageSoundFromFile = async (soundPath: string = '/sound/duckquack.wav'): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(soundPath);
      audio.volume = 0.5;
      
      audio.onended = () => {
        resolve(true);
      };
      
      audio.onerror = () => {
        console.warn(`Could not load sound file: ${soundPath}`);
        resolve(false);
      };
      
      // Timeout fallback
      setTimeout(() => resolve(true), 1000);
      
      audio.play().catch(() => {
        resolve(false);
      });
    } catch (error) {
      console.error('Error playing sound file:', error);
      resolve(false);
    }
  });
};

/**
 * Synthesized notification sound as fallback
 * Creates a pleasant two-tone notification sound using Web Audio API
 */
export const playMessageNotificationSoundSynthesized = async () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioContext.currentTime;
    
    // Create master gain node to control overall volume
    const masterGain = audioContext.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioContext.destination);
    
    // ==================== First Beep ====================
    // 880 Hz (A5) - brief, falling tone
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(masterGain);
    
    osc1.frequency.value = 880;
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.05, now + 0.12);
    
    osc1.start(now);
    osc1.stop(now + 0.12);
    
    // ==================== Second Beep ====================
    // 1046 Hz (C6) - higher pitch, slightly longer
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(masterGain);
    
    osc2.frequency.value = 1046;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0, now + 0.15);
    gain2.gain.setValueAtTime(0.4, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.05, now + 0.3);
    
    osc2.start(now + 0.15);
    osc2.stop(now + 0.3);
  } catch (error) {
    console.error('Error playing synthesized notification sound:', error);
  }
};

/**
 * Enable/Disable notification sounds globally
 */
let soundsEnabled = true;

export const setSoundsEnabled = (enabled: boolean) => {
  soundsEnabled = enabled;
  localStorage.setItem('ddy_sounds_enabled', JSON.stringify(enabled));
};

export const getSoundsEnabled = (): boolean => {
  const stored = localStorage.getItem('ddy_sounds_enabled');
  if (stored !== null) {
    soundsEnabled = JSON.parse(stored);
  }
  return soundsEnabled;
};

/**
 * Conditionally play sound based on user preference
 */
export const playNotificationSoundIfEnabled = async () => {
  if (getSoundsEnabled()) {
    await playMessageNotificationSound();
  }
};
