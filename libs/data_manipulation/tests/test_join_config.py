"""Unit tests for JoinConfig / IntegrityTransformation.join model."""

from uuid import UUID

import pytest
from pydantic import ValidationError

from data_manipulation.models import IntegrityTransformation, JoinColumn, JoinConfig


def test_integrity_transformation_join_defaults_to_none():
    transformation = IntegrityTransformation()

    assert transformation.join is None


def test_join_config_round_trips_through_model_dump():
    join = JoinConfig(
        table_id=UUID("12345678-1234-5678-1234-567812345678"),
        left_column="postal_code",
        right_column="code",
        columns=[JoinColumn(column_name="city"), JoinColumn(column_name="region")],
    )
    transformation = IntegrityTransformation(join=join)

    dumped = transformation.model_dump(mode="json")

    assert dumped["join"] == {
        "table_id": "12345678-1234-5678-1234-567812345678",
        "left_column": "postal_code",
        "right_column": "code",
        "columns": [{"column_name": "city"}, {"column_name": "region"}],
    }


def test_join_config_requires_table_id():
    with pytest.raises(ValidationError):
        JoinConfig.model_validate(
            {"left_column": "postal_code", "right_column": "code", "columns": []}
        )
