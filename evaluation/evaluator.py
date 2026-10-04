from typing import Optional

from backend.models.training import DecisionAttempt, DecisionEvaluationResult
from backend.models.workmap import WorkMap
from evaluation.deterministic import DeterministicEvaluator
from evaluation.semantic import SemanticEvaluator
from vision.claude.client import ClaudeClient


class DecisionEvaluator:
    def __init__(self, client: Optional[ClaudeClient] = None):
        self.deterministic = DeterministicEvaluator()
        self.semantic = SemanticEvaluator(client=client)

    def evaluate(
        self,
        attempt: DecisionAttempt,
        work_map: Optional[WorkMap] = None,
        client: Optional[ClaudeClient] = None,
    ) -> DecisionEvaluationResult:
        # Deterministic evaluation takes absolute priority
        det_result = self.deterministic.evaluate(attempt, work_map)
        if det_result is not None:
            return det_result

        # Ambiguous cases defer to semantic evaluation
        return self.semantic.evaluate(attempt, work_map, client=client)
