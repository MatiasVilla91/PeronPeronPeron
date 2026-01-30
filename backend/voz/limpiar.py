import noisereduce as nr
import librosa
import soundfile as sf

y, sr = librosa.load("peron_total.wav", sr=None)
reduced = nr.reduce_noise(y=y, sr=sr)
sf.write("peron_total_limpio2.wav", reduced, sr)
