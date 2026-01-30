from TTS.api import TTS

# 1️⃣ Cargar un modelo preentrenado (voz multi-speaker)
tts = TTS(model_name="tts_models/multilingual/multi-dataset/vits", progress_bar=True, gpu=True)

# 2️⃣ Archivo de tu voz (Perón)
reference_wav = "peron.wav"

# 3️⃣ Texto a generar
text = "Viva la Patria!"

# 4️⃣ Generar audio con la voz de Perón
tts.tts_to_file(
    text=text,
    speaker_wav=reference_wav,
    file_path="peron_sintetizado.wav"
)

print("¡Audio generado con la voz de Perón!")
