"""Add agent secrets and audit hash fields.

Revision ID: 20260303_0002
Revises: 20260220_0001
Create Date: 2026-03-03 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260303_0002"
down_revision: Union[str, None] = "20260220_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_secrets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("encrypted_key", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("agent_id", "name", name="uq_agent_secrets_agent_name"),
    )
    op.create_index(op.f("ix_agent_secrets_agent_id"), "agent_secrets", ["agent_id"], unique=False)

    op.add_column("audit_logs", sa.Column("previous_hash", sa.String(), nullable=True))
    op.alter_column("audit_logs", "hash_chain", new_column_name="hash")


def downgrade() -> None:
    op.alter_column("audit_logs", "hash", new_column_name="hash_chain")
    op.drop_column("audit_logs", "previous_hash")

    op.drop_index(op.f("ix_agent_secrets_agent_id"), table_name="agent_secrets")
    op.drop_table("agent_secrets")
