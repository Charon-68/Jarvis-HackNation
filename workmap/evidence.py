from typing import Dict, List, Optional
from backend.models.answer import ExpertAnswer
from backend.models.event import ScreenEvent
from backend.models.workmap import WorkMapStep


class EvidenceAssociator:
    @staticmethod
    def associate_evidence(
        steps: List[WorkMapStep],
        events: List[ScreenEvent],
        answers: List[ExpertAnswer],
    ) -> List[WorkMapStep]:
        event_by_id: Dict[str, ScreenEvent] = {e.id: e for e in events if e.id}
        events_by_ticket: Dict[str, List[ScreenEvent]] = {}
        for e in events:
            if e.ticketId:
                events_by_ticket.setdefault(e.ticketId, []).append(e)

        answers_by_event: Dict[str, List[ExpertAnswer]] = {}
        for a in answers:
            if a.relatedEventId:
                answers_by_event.setdefault(a.relatedEventId, []).append(a)

        for step in steps:
            if step.ticketId and not step.sourceEventIds:
                matching_events = events_by_ticket.get(step.ticketId, [])
                if matching_events:
                    step.sourceEventIds = [e.id for e in matching_events if e.id]
                    if not step.screenshotRef:
                        for me in matching_events:
                            if me.screenshotRef:
                                step.screenshotRef = me.screenshotRef
                                break

            if step.sourceEventIds:
                for evt_id in step.sourceEventIds:
                    evt = event_by_id.get(evt_id)
                    if evt and evt.screenshotRef and not step.screenshotRef:
                        step.screenshotRef = evt.screenshotRef

                    related_ans = answers_by_event.get(evt_id, [])
                    if related_ans and not step.expertQuote:
                        step.expertQuote = related_ans[0].answer

        return steps
