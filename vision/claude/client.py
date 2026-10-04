import os
import time
from typing import Any, Optional


class ClaudeAdapterError(Exception):
    def __init__(
        self,
        message: str,
        code: str = "CLAUDE_ADAPTER_ERROR",
        retryable: bool = False,
    ):
        self.message = message
        self.code = code
        self.retryable = retryable
        super().__init__(f"[{code}] {message}")


class ClaudeClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "claude-3-5-sonnet-20241022",
        max_retries: int = 2,
        timeout: float = 30.0,
        mock_client: Optional[Any] = None,
    ):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.model = model
        self.max_retries = max_retries
        self.timeout = timeout
        self.mock_client = mock_client

    def analyze_image(
        self,
        image_base64: str,
        system_prompt: str,
        user_prompt: str,
        media_type: str = "image/png",
    ) -> str:
        """
        Sends multimodal screenshot image to Claude and returns raw text response.
        Delegates to mock_client if provided.
        """
        if self.mock_client is not None:
            return self.mock_client.analyze_image(
                image_base64=image_base64,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                media_type=media_type,
            )

        if not self.api_key:
            raise ClaudeAdapterError(
                "ANTHROPIC_API_KEY environment variable is not set.",
                code="API_KEY_MISSING",
                retryable=False,
            )

        last_exception = None
        for attempt in range(self.max_retries + 1):
            try:
                return self._call_anthropic_api(
                    image_base64=image_base64,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    media_type=media_type,
                )
            except Exception as e:
                last_exception = e
                if attempt < self.max_retries:
                    time.sleep(0.5 * (2**attempt))
                else:
                    raise ClaudeAdapterError(
                        f"Claude API call failed after {self.max_retries + 1} attempts: {str(e)}",
                        code="CLAUDE_API_FAILURE",
                        retryable=True,
                    ) from e

        raise ClaudeAdapterError(
            f"Claude API call failed: {str(last_exception)}",
            code="CLAUDE_API_FAILURE",
        )

    def _call_anthropic_api(
        self,
        image_base64: str,
        system_prompt: str,
        user_prompt: str,
        media_type: str,
    ) -> str:
        try:
            import anthropic
        except ImportError as e:
            raise ClaudeAdapterError(
                "The 'anthropic' package is not installed.",
                code="DEPENDENCY_MISSING",
            ) from e

        client = anthropic.Anthropic(api_key=self.api_key, timeout=self.timeout)

        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_base64,
                        },
                    },
                    {
                        "type": "text",
                        "text": user_prompt,
                    },
                ],
            }
        ]

        response = client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        )

        if not response.content:
            raise ClaudeAdapterError(
                "Received empty response content from Claude Vision",
                code="EMPTY_RESPONSE",
            )

        return response.content[0].text
