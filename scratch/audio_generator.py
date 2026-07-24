import wave
import struct
import math

def generate_chime():
    # Audio parameters
    sample_rate = 44100
    duration = 1.5  # seconds
    num_samples = int(sample_rate * duration)
    
    # Open WAV file for writing
    with wave.open("../audio/greeting.wav", "w") as wav_file:
        # Set params: 1 channel, 2 bytes sample width (16-bit), 44100 sample rate
        wav_file.setparams((1, 2, sample_rate, num_samples, "NONE", "not compressed"))
        
        # We will create a rising arpeggio chime (C4 -> E4 -> G4 -> C5)
        # to sound like a cheerful game/toy chime.
        frequencies = [261.63, 329.63, 392.00, 523.25]
        note_duration = duration / len(frequencies)
        samples_per_note = int(sample_rate * note_duration)
        
        for note_index, freq in enumerate(frequencies):
            for i in range(samples_per_note):
                # Calculate time in seconds
                t = i / sample_rate
                
                # Fade in at start of note and fade out at end of note
                fade_in = min(1.0, (i / (sample_rate * 0.05)))
                fade_out = min(1.0, ((samples_per_note - i) / (sample_rate * 0.15)))
                amplitude = 16000 * fade_in * fade_out
                
                # Generate sine wave
                value = int(amplitude * math.sin(2 * math.pi * freq * t))
                
                # Pack as 16-bit signed integer
                data = struct.pack("<h", value)
                wav_file.writeframes(data)
                
    print("Successfully generated audio/greeting.wav chime!")

if __name__ == "__main__":
    generate_chime()
