from datetime import datetime


def serialize_message(message: dict) -> dict:
    def convert(value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

    return {k: convert(v) for k, v in message.items()}