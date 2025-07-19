# habla_peron.py
import sys
from bark import SAMPLE_RATE, generate_audio, preload_models
import scipy
import numpy as np
import os
import random

preload_models()

if len(sys.argv) < 3:
    print("Uso: python habla_peron.py \"Texto a decir\" ruta_salida.wav")
    sys.exit(1)

texto = sys.argv[1]
ruta_salida = sys.argv[2]

# Ruta a los prompts
prompt_base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "prompts"))

# Filtrar solo archivos .npz dentro del folder (ignorar carpetas como v2 u otros nests si querés)
npz_files = [
    f for f in os.listdir(prompt_base)
    if f.endswith(".npz") and os.path.isfile(os.path.join(prompt_base, f))
]

if not npz_files:
    raise FileNotFoundError("❌ No se encontraron archivos .npz en la carpeta de prompts")

# Elegir uno aleatorio
prompt_filename = random.choice(npz_files)
prompt_path = os.path.join(prompt_base, prompt_filename)
print(f"🎙️ Usando voz: {prompt_filename}")

# Cargar el prompt
history_data = np.load(prompt_path, allow_pickle=True)
history_prompt = {
    "semantic_prompt": history_data["semantic_prompt"],
    "coarse_prompt": history_data["coarse_prompt"],
    "fine_prompt": history_data["fine_prompt"]
}

# Generar y guardar el audio
audio_array = generate_audio(texto, history_prompt=history_prompt)
scipy.io.wavfile.write(ruta_salida, SAMPLE_RATE, audio_array)

print("✅ Audio generado:", ruta_salida)
