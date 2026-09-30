from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_marker_columns(engine: Engine) -> None:
    """Idempotent compatibility migration for deployments created before v1.8."""
    inspector = inspect(engine)
    if "markers" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("markers")}
    json_default = "'[]'::json" if engine.dialect.name == "postgresql" else "'[]'"
    statements = {
        "status": "ALTER TABLE markers ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'active'",
        "cleanup_slots": f"ALTER TABLE markers ADD COLUMN cleanup_slots JSON NOT NULL DEFAULT {json_default}",
        "cleaned_at": "ALTER TABLE markers ADD COLUMN cleaned_at TIMESTAMP WITH TIME ZONE NULL",
        "evidence_photo": "ALTER TABLE markers ADD COLUMN evidence_photo VARCHAR(1000) NULL",
    }
    with engine.begin() as connection:
        for column, statement in statements.items():
            if column not in existing:
                connection.execute(text(statement))
