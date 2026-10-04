from privacy.redactor import TextRedactor


def test_redact_email_and_phone():
    redactor = TextRedactor(use_presidio=False)
    input_text = "Contact john.doe@example.com or call 555-123-4567 for help."
    redacted = redactor.redact(input_text)

    assert "john.doe@example.com" not in redacted
    assert "[REDACTED_EMAIL]" in redacted
    assert "555-123-4567" not in redacted
    assert "[REDACTED_PHONE]" in redacted


def test_redact_api_key_and_ssn():
    redactor = TextRedactor(use_presidio=False)
    input_text = "My secret key is sk_live_1234567890abcdef123456 and SSN is 000-12-3456."
    redacted = redactor.redact(input_text)

    assert "sk_live_1234567890abcdef123456" not in redacted
    assert "[REDACTED_API_KEY]" in redacted
    assert "000-12-3456" not in redacted
    assert "[REDACTED_SSN]" in redacted


def test_empty_string_handling():
    redactor = TextRedactor(use_presidio=False)
    assert redactor.redact("") == ""
    assert redactor.redact(None) == ""
