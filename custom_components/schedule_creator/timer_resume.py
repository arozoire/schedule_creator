"""What an entity goes back to when its Quick Timer ends (or is cancelled).

A Quick Timer owns its entity until it ends, even when schedules start or end
meanwhile. At its end the entity takes what it would have without the timer:

1. the schedule running then (its start action, sent through its lease);
2. otherwise the end action of a running slot whose condition is false;
3. otherwise what the last slot that ended during the timer left: its end
   action, or its start action when it started during the timer and has none;
4. otherwise the state from before the timer (its snapshot).

Pure: the same answer serves the card preview (at ``expires_at``) and the
real decision when the timer ends (at that instant).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum

from .models import (
    RESTORE_PREVIOUS_ACTION,
    ConditionBranch,
    Occurrence,
    OccurrenceState,
    QuickTimer,
    TargetAction,
)
from .storage import RuntimeStoreData

_LIVE = {OccurrenceState.PENDING, OccurrenceState.ACTIVE, OccurrenceState.SUSPENDED}
# Slots that end before ``at``; a preview also counts slots that have not
# ended yet. Cancelled ones (replaced by an edit, profile switched off) do not.
_ENDED = {*_LIVE, OccurrenceState.COMPLETED}


class ResumeKind(StrEnum):
    """Source of the state applied when a Quick Timer ends."""

    SCHEDULE = "schedule"
    CONDITION_FALLBACK = "condition_fallback"
    SCHEDULE_END = "schedule_end"
    PREVIOUS = "previous"


@dataclass(frozen=True, slots=True)
class TimerResume:
    """The state an entity takes back at the end of its Quick Timer."""

    kind: ResumeKind
    occurrence: Occurrence | None = None
    action: TargetAction | None = None


def _applies(occurrence: Occurrence) -> bool:
    if occurrence.frozen_schedule.condition is None:
        return True
    return occurrence.condition_branch is not ConditionBranch.FALSE


def timer_resume(
    runtime: RuntimeStoreData, timer: QuickTimer, at: datetime
) -> TimerResume:
    """Decide what the timer's entity takes back at ``at``."""

    mine = [
        occurrence
        for occurrence in runtime.occurrences
        if timer.entity_id in occurrence.frozen_schedule.target_entity_ids
    ]
    running = [
        occurrence
        for occurrence in mine
        if occurrence.state in _LIVE and occurrence.start_utc <= at < occurrence.end_utc
    ]
    applying = [occurrence for occurrence in running if _applies(occurrence)]
    if applying:
        # Same rule as overlapping slots: the one that started last.
        chosen = max(applying, key=lambda item: (item.start_utc, item.id))
        return TimerResume(
            ResumeKind.SCHEDULE, chosen, chosen.frozen_schedule.start_action
        )
    muted = [
        occurrence
        for occurrence in running
        if occurrence.frozen_schedule.end_action is not None
    ]
    if muted:
        chosen = max(muted, key=lambda item: (item.start_utc, item.id))
        return TimerResume(
            ResumeKind.CONDITION_FALLBACK, chosen, chosen.frozen_schedule.end_action
        )
    ended = [
        occurrence
        for occurrence in mine
        if occurrence.state in _ENDED and timer.starts_at < occurrence.end_utc <= at
    ]
    if ended:
        last = max(ended, key=lambda item: (item.end_utc, item.start_utc, item.id))
        end_action = last.frozen_schedule.end_action
        if end_action is not None and end_action.action != RESTORE_PREVIOUS_ACTION:
            return TimerResume(ResumeKind.SCHEDULE_END, last, end_action)
        if end_action is None and last.start_utc > timer.starts_at and _applies(last):
            return TimerResume(
                ResumeKind.SCHEDULE_END, last, last.frozen_schedule.start_action
            )
        # restore_previous, or a slot that ran before the timer and left its
        # state: the state from before the timer is the closest we know.
    return TimerResume(ResumeKind.PREVIOUS)
