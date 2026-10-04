from typing import List
from backend.models.workmap import WorkMap, WorkMapStep


class WorkMapValidationError(Exception):
    def __init__(self, message: str, code: str = "WORKMAP_INVALID"):
        self.message = message
        self.code = code
        super().__init__(f"[{code}] {message}")


class WorkMapValidator:
    @staticmethod
    def validate(work_map: WorkMap, teach_back_confirmed: bool = False) -> WorkMap:
        if work_map.workflowName != "Support Ticket Triage":
            raise WorkMapValidationError(
                f"Invalid workflowName '{work_map.workflowName}'. Expected 'Support Ticket Triage'."
            )

        if not work_map.steps or not isinstance(work_map.steps, list):
            raise WorkMapValidationError("WorkMap must contain a non-empty list of steps.")

        seen_step_numbers = set()
        prev_step_num = 0

        for idx, step in enumerate(work_map.steps):
            if not isinstance(step, WorkMapStep):
                raise WorkMapValidationError(f"Step at index {idx} is not a valid WorkMapStep.")

            if step.stepNumber <= 0:
                raise WorkMapValidationError(
                    f"Step number at index {idx} must be positive, got {step.stepNumber}."
                )

            if step.stepNumber in seen_step_numbers:
                raise WorkMapValidationError(
                    f"Duplicate step number {step.stepNumber} found in WorkMap."
                )
            seen_step_numbers.add(step.stepNumber)

            if step.stepNumber <= prev_step_num:
                raise WorkMapValidationError(
                    f"Steps must be ordered sequentially. Step {step.stepNumber} follows {prev_step_num}."
                )
            prev_step_num = step.stepNumber

            if step.timestampMs < 0:
                raise WorkMapValidationError(
                    f"Invalid negative timestampMs {step.timestampMs} in step {step.stepNumber}."
                )

            for field in ["observedAction", "decision", "expertReason", "teachingPoint"]:
                val = getattr(step, field)
                if not val or not isinstance(val, str) or not val.strip():
                    raise WorkMapValidationError(
                        f"Step {step.stepNumber} missing required field '{field}'."
                    )

            if not isinstance(step.guardrails, list):
                raise WorkMapValidationError(f"Step {step.stepNumber} guardrails must be a list.")
            if not isinstance(step.exceptions, list):
                raise WorkMapValidationError(f"Step {step.stepNumber} exceptions must be a list.")

        # Expert confirmation gating requirement
        if work_map.confirmedByExpert and not teach_back_confirmed:
            work_map.confirmedByExpert = False

        if teach_back_confirmed:
            work_map.confirmedByExpert = True

        return work_map
