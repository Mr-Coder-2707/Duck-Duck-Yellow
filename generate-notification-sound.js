#!/usr/bin/env node

/**
 * Generate WhatsApp-style message notification sound as WAV file
 * Run: node generate-notification-sound.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Audio parameters
const SAMPLE_RATE = 44100; // Hz
const DURATION_1 = 0.12;  // First tone: 120ms
const DURATION_2 = 0.15;  // Second tone: 150ms
const SILENCE = 0.03;     // Silence between tones: 30ms
const FREQ_1 = 880;       // A5
const FREQ_2 = 1046;      // C6
const VOLUME = 0.4;

function generateTone(frequency, duration, sampleRate = SAMPLE_RATE) {
  const samples = Math.floor(sampleRate * duration);
  const buffer = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    // Sine wave with envelope (fade in/out)
    const envelope = Math.exp(-5 * t / duration);
    buffer[i] = Math.sin(2 * Math.PI * frequency * t) * VOLUME * envelope;
  }

  return buffer;
}

function generateSilence(duration, sampleRate = SAMPLE_RATE) {
  const samples = Math.floor(sampleRate * duration);
  return new Float32Array(samples);
}

function floatTo16BitPCM(input) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

function createWavFile(audioData, sampleRate = SAMPLE_RATE) {
  const wav = new Uint8Array(44 + audioData.length * 2);
  
  // WAV header
  const write = (offset, value, length) => {
    for (let i = 0; i < length; i++) {
      wav[offset + i] = (value >> (i * 8)) & 0xff;
    }
  };

  // RIFF identifier
  wav[0] = 0x52; wav[1] = 0x49; wav[2] = 0x46; wav[3] = 0x46;
  // File size (minus 8 for RIFF)
  write(4, wav.length - 8, 4);
  // RIFF type
  wav[8] = 0x57; wav[9] = 0x41; wav[10] = 0x56; wav[11] = 0x45;
  // Fmt chunk
  wav[12] = 0x66; wav[13] = 0x6d; wav[14] = 0x74; wav[15] = 0x20;
  // Fmt size
  write(16, 16, 4);
  // Audio format (PCM)
  write(20, 1, 2);
  // Channels (mono)
  write(22, 1, 2);
  // Sample rate
  write(24, sampleRate, 4);
  // Byte rate
  write(28, sampleRate * 2, 4);
  // Block align
  write(32, 2, 2);
  // Bits per sample
  write(34, 16, 2);
  // Data chunk
  wav[36] = 0x64; wav[37] = 0x61; wav[38] = 0x74; wav[39] = 0x61;
  // Data size
  write(40, audioData.length * 2, 4);

  // Copy audio data
  const view = new DataView(wav.buffer);
  for (let i = 0; i < audioData.length; i++) {
    view.setInt16(44 + i * 2, audioData[i], true);
  }

  return wav;
}

function generateNotificationSound() {
  // Generate tones
  const tone1 = generateTone(FREQ_1, DURATION_1);
  const silence = generateSilence(SILENCE);
  const tone2 = generateTone(FREQ_2, DURATION_2);

  // Combine all
  const totalSamples = tone1.length + silence.length + tone2.length;
  const combined = new Float32Array(totalSamples);
  
  let offset = 0;
  combined.set(tone1, offset);
  offset += tone1.length;
  combined.set(silence, offset);
  offset += silence.length;
  combined.set(tone2, offset);

  return combined;
}

// Generate and save
const audioData = generateNotificationSound();
const pcmData = floatTo16BitPCM(audioData);
const wavData = createWavFile(pcmData);

const outputPath = path.join(__dirname, 'src', 'sound', 'message-notification.wav');
fs.writeFileSync(outputPath, Buffer.from(wavData));

console.log(`✅ Message notification sound generated: ${outputPath}`);
console.log(`📊 Duration: ${(audioData.length / SAMPLE_RATE).toFixed(3)}s`);
console.log(`📁 Size: ${(wavData.length / 1024).toFixed(2)} KB`);
