FROM python:3.10-slim

# Instalar dependencias básicas
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Instalar librerías de audio y ML
RUN pip install --upgrade pip
RUN pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
RUN pip install matplotlib numpy scipy TTS

# Carpeta de trabajo
WORKDIR /app

# Copiar archivos locales (opcional)
COPY . /app

CMD ["bash"]
