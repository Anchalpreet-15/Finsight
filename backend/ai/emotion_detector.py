"""
Emotion Detector using GoEmotions BERT (bhadresh-savani/bert-base-go-emotion).

GoEmotions produces 28 fine-grained emotion classes.  We map them to a set of
user-friendly labels that drive the tone of the LLM response.
"""

import logging
from transformers import pipeline

logger = logging.getLogger(__name__)

# Maps each of the 28 GoEmotions labels → (friendly_name, hex_color)
EMOTION_MAP: dict[str, tuple[str, str]] = {
    "admiration":     ("positive",   "#10b981"),
    "amusement":      ("amused",     "#f59e0b"),
    "anger":          ("stressed",   "#ef4444"),
    "annoyance":      ("stressed",   "#ef4444"),
    "approval":       ("positive",   "#10b981"),
    "caring":         ("positive",   "#10b981"),
    "confusion":      ("confused",   "#8b5cf6"),
    "curiosity":      ("curious",    "#3b82f6"),
    "desire":         ("motivated",  "#f59e0b"),
    "disappointment": ("sad",        "#6b7280"),
    "disapproval":    ("stressed",   "#ef4444"),
    "disgust":        ("stressed",   "#ef4444"),
    "embarrassment":  ("anxious",    "#f97316"),
    "excitement":     ("excited",    "#f59e0b"),
    "fear":           ("fearful",    "#dc2626"),
    "gratitude":      ("grateful",   "#10b981"),
    "grief":          ("sad",        "#6b7280"),
    "joy":            ("excited",    "#f59e0b"),
    "love":           ("positive",   "#10b981"),
    "nervousness":    ("anxious",    "#f97316"),
    "optimism":       ("optimistic", "#10b981"),
    "pride":          ("positive",   "#10b981"),
    "realization":    ("curious",    "#3b82f6"),
    "relief":         ("relieved",   "#10b981"),
    "remorse":        ("sad",        "#6b7280"),
    "sadness":        ("sad",        "#6b7280"),
    "surprise":       ("surprised",  "#8b5cf6"),
    "neutral":        ("neutral",    "#6b7280"),
}


class EmotionDetector:
    """
    Lazily loads the GoEmotions BERT model and exposes a `detect()` method.
    Uses a singleton pattern so the model is only loaded once per process.
    """

    def __init__(self):
        self._classifier = None

    def _load_model(self):
        if self._classifier is not None:
            return
        logger.info("Loading GoEmotions BERT model (first-time download may take ~1–2 min)…")
        self._classifier = pipeline(
            "text-classification",
            model="bhadresh-savani/bert-base-go-emotion",
            top_k=1,
            device=-1,  # Force CPU; set to 0 for GPU
        )
        logger.info("GoEmotions BERT model loaded successfully.")

    def detect(self, text: str) -> dict:
        """
        Detect the dominant emotion in `text`.

        Returns:
            {
                "raw_label": str,      # original GoEmotions label
                "emotion":   str,      # user-friendly label
                "score":     float,    # confidence [0, 1]
                "color":     str,      # hex color for UI badge
            }
        """
        self._load_model()

        # Truncate to 512 chars (BERT max tokens ≈ 512 word-pieces)
        result = self._classifier(text[:512])
        top = result[0][0]  # top_k=1 returns [[{label, score}]]

        label = top["label"]
        score = round(top["score"], 4)
        friendly, color = EMOTION_MAP.get(label, ("neutral", "#6b7280"))

        logger.debug(f"Emotion detected: {label} → {friendly} ({score:.2%})")
        return {
            "raw_label": label,
            "emotion":   friendly,
            "score":     score,
            "color":     color,
        }


# Module-level singleton
emotion_detector = EmotionDetector()
