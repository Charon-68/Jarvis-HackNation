from typing import Dict, List, Optional
from backend.models.event import ScreenEvent


class EventDeduplicator:
    def __init__(self, time_window_ms: int = 5000):
        self.time_window_ms = time_window_ms
        self._last_event_by_session: Dict[str, ScreenEvent] = {}

    def is_duplicate(self, event: ScreenEvent) -> bool:
        last_event = self._last_event_by_session.get(event.sessionId)
        if not last_event:
            return False

        same_ticket = last_event.ticketId == event.ticketId
        same_type = last_event.type == event.type
        same_new_val = last_event.newValue == event.newValue
        same_prev_val = last_event.previousValue == event.previousValue

        if same_ticket and same_type and same_new_val and same_prev_val:
            if abs(event.timestampMs - last_event.timestampMs) <= self.time_window_ms:
                return True

        return False

    def should_emit(self, event: ScreenEvent) -> bool:
        if self.is_duplicate(event):
            return False
        self._last_event_by_session[event.sessionId] = event
        return True

    def filter_events(self, events: List[ScreenEvent]) -> List[ScreenEvent]:
        unique_events: List[ScreenEvent] = []
        for evt in events:
            if self.should_emit(evt):
                unique_events.append(evt)
        return unique_events

    def reset(self, session_id: Optional[str] = None) -> None:
        if session_id:
            self._last_event_by_session.pop(session_id, None)
        else:
            self._last_event_by_session.clear()
