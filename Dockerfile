FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user
USER user

ENV PATH="/home/user/.local/bin:$PATH" \
    HF_HOME=/home/user/.cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/home/user/.cache/huggingface \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /home/user/app

RUN pip install --user --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch

COPY --chown=user backend/requirements.txt ./requirements.txt
RUN pip install --user --no-cache-dir -r requirements.txt

COPY --chown=user backend ./backend
COPY --chown=user data ./data

WORKDIR /home/user/app/backend

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
