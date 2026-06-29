"""
Debounced background MF retraining.

Votes and ratings call schedule_mf_retrain() instead of blocking the HTTP
request on recommender.fit() (~30s+ on a large catalog startup path).
"""

from __future__ import annotations

import threading

_lock = threading.Lock()
_timer: threading.Timer | None = None
_training = False

# Wait this long after the last signal before retraining
DEBOUNCE_SECONDS = 3.0


def _run_mf_retrain() -> None:
    global _training
    from .recommender import recommender

    with _lock:
        _training = True
    try:
        result = recommender.fit()
        print(
            f"Background MF retrain done: {result['matrix_shape']} "
            f"loss {result['final_loss']}"
        )
    except ValueError as exc:
        print(f"Background MF retrain skipped: {exc}")
    except Exception as exc:
        print(f"Background MF retrain failed: {exc}")
    finally:
        with _lock:
            _training = False


def schedule_mf_retrain() -> None:
    """Queue an MF retrain after DEBOUNCE_SECONDS of quiet."""
    global _timer

    def _start_timer() -> None:
        global _timer
        with _lock:
            if _timer is not None:
                _timer.cancel()
            _timer = threading.Timer(DEBOUNCE_SECONDS, _run_mf_retrain)
            _timer.daemon = True
            _timer.start()

    _start_timer()


def is_training() -> bool:
    with _lock:
        return _training
