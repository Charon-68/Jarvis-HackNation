import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Fallback regex patterns for common PII and secrets
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
PHONE_REGEX = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
SSN_REGEX = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
CREDIT_CARD_REGEX = re.compile(r"\b(?:\d[ -]*?){13,16}\b")
API_KEY_REGEX = re.compile(r"\b(?:sk|pk|api)_(?:live|test)_[0-9a-zA-Z]{16,}\b", re.IGNORECASE)


class TextRedactor:
    def __init__(self, use_presidio: bool = True):
        self.presidio_analyzer = None
        self.presidio_anonymizer = None

        if use_presidio:
            try:
                from presidio_analyzer import AnalyzerEngine
                from presidio_anonymizer import AnonymizerEngine

                self.presidio_analyzer = AnalyzerEngine()
                self.presidio_anonymizer = AnonymizerEngine()
            except Exception as e:
                logger.debug(f"Presidio not available or failed to load ({e}), using regex fallback.")

    def redact(self, text: Optional[str]) -> str:
        if not text:
            return ""

        redacted_text = text

        # 1. Try Presidio if available
        if self.presidio_analyzer and self.presidio_anonymizer:
            try:
                results = self.presidio_analyzer.analyze(
                    text=redacted_text,
                    language="en",
                    entities=["EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD", "PERSON"],
                )
                anonymized = self.presidio_anonymizer.anonymize(
                    text=redacted_text,
                    analyzer_results=results,
                )
                redacted_text = anonymized.text
            except Exception as e:
                logger.warning(f"Presidio redaction failed: {e}. Falling back to regex.")

        # 2. Always apply regex fallback for extra security (API keys, SSNs, remaining PII)
        redacted_text = EMAIL_REGEX.sub("[REDACTED_EMAIL]", redacted_text)
        redacted_text = PHONE_REGEX.sub("[REDACTED_PHONE]", redacted_text)
        redacted_text = SSN_REGEX.sub("[REDACTED_SSN]", redacted_text)
        redacted_text = CREDIT_CARD_REGEX.sub("[REDACTED_CARD]", redacted_text)
        redacted_text = API_KEY_REGEX.sub("[REDACTED_API_KEY]", redacted_text)

        return redacted_text
