import os
from TTS.api import TTS

# Inicializar una sola vez (fuera del endpoint)
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")

# Ruta al audio limpio de Perón
SPEAKER_WAV = "peron_total_limpio2.wav"

def generar_respuesta_en_audio(respuesta_texto: str, nombre_archivo="respuesta_peron.wav"):
    """
    Genera un audio con la voz de Perón diciendo el texto que produce el backend.
    """
    # Normalizar texto (por si viene con saltos o símbolos raros)
    texto = respuesta_texto.strip().replace("\n", " ")

    # Generar el audio con la voz clonada
    tts.tts_to_file(
        text=texto,
        file_path=nombre_archivo,
        speaker_wav=SPEAKER_WAV,
        language="es",
        speed=0.88,
        temperature=0.12
    )

    print(f"✅ Audio generado: {nombre_archivo}")
    return nombre_archivo


# 🧠 Ejemplo de uso con una respuesta generada por tu modelo (backend)
respuesta_del_bot = (
    "Compañeros, la grandeza de la patria se construye con el esfuerzo de todos. "
    "La justicia social no es un sueño, es una realidad que debemos defender día a día."
)

# Generar audio
generar_respuesta_en_audio(respuesta_del_bot)


'''
import os
from TTS.api import TTS

# 1. Descargar y cargar el modelo XTTS v2
model_name = "tts_models/multilingual/multi-dataset/xtts_v2"
tts = TTS(model_name)

# 2. Archivo de voz de Perón ya limpio
speaker_wav = "peron_total_limpio2.wav"  # 👈 usamos directamente tu audio limpio

# 3. Texto que querés que la IA lea con esa voz
texto = (
    "Queridos compatriotas del pueblo argentino. "
    "Soy Juan Domingo Perón. "
    "Hola Matías, ¿cómo estás? "
    "¡Muerte a los salvajes unitarios! "
    "Voten a Coti San Pedro."
)

# 4. Generar el audio clonando la voz limpia
tts.tts_to_file(
    text=texto,
    file_path="peron_clonado.wav",
    speaker_wav=speaker_wav,
    language="es",
    speed=0.85,          # Perón hablaba más pausado
    temperature=0.10     # más bajo = voz más estable y parecida
)

print("✅ Audio generado con la voz de Perón (limpia): peron_clonado.wav")
#FIN FIN FIN 
# clonar_peron.py
import os
from pydub import AudioSegment
from TTS.api import TTS

# 1. Descargar y cargar el modelo XTTS v2
model_name = "tts_models/multilingual/multi-dataset/xtts_v2"
tts = TTS(model_name)

# 2. Carpeta donde están los audios de Perón
folder = "PERON_AUDIOS"

# Combinar todos los audios de la carpeta en un solo wav
combined = AudioSegment.empty()
for filename in os.listdir(folder):
    if filename.endswith(".wav"):
        filepath = os.path.join(folder, filename)
        combined += AudioSegment.from_wav(filepath)

# Guardar el audio combinado temporal
speaker_wav = "peron_total_limpio.wav"
combined.export(speaker_wav, format="wav")
print(f"✅ Audios combinados en: {speaker_wav}")

# 3. Texto que querés que la IA lea con esa voz
texto = (
    "Queridos compatriotas del pueblo argentino. "
    "Soy Juan Domingo Perón. "
    "Hola Matías, ¿cómo estás? "
    "¡Muerte a los salvajes unitarios!"
    "VOTEN A COTI SAN PEDRO"
)


# 4. Generar el audio clonando la voz
tts.tts_to_file(
    text=texto,
    file_path="peron_clonado.wav",
    speaker_wav=speaker_wav,
    language="es",
    speed=0.85,          # Perón hablaba más pausado
    temperature=0.15     # más bajo = más parecido a la voz base

)

print("✅ Audio generado: peron_clonado.wav")
'''
