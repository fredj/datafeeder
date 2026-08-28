"""Tests for join configuration persistence in staging metadata endpoints."""

from unittest.mock import MagicMock, patch
from uuid import uuid4

from src.api.routes.ingestion.staging import edit_staging_metadata
from src.models.data_import import Join, JoinColumn, StagingMetadata


class TestEditStagingMetadataJoin:
    """Test edit_staging_metadata (PUT) persists the join configuration."""

    @patch("src.api.routes.ingestion.staging.get_staging_schema", return_value="staging")
    @patch("src.api.routes.ingestion.staging.select")
    @patch("src.api.routes.ingestion.staging.Table")
    @patch("src.api.routes.ingestion.staging._resolve_columns")
    @patch("src.api.routes.ingestion.staging._detect_original_projection")
    @patch("src.api.routes.ingestion.staging.load_authorized_integrity_link")
    def test_join_config_is_persisted_and_returned(
        self,
        mock_load: MagicMock,
        mock_detect_proj: MagicMock,
        mock_resolve_cols: MagicMock,
        mock_table: MagicMock,
        mock_select: MagicMock,
        mock_get_schema: MagicMock,
    ) -> None:
        mock_link = MagicMock()
        mock_link.integrity_title = "Parcelles"
        mock_link.source_file_name = None
        mock_link.source_file_type = None
        mock_link.source_import_type = "url"
        mock_link.source_url = None
        mock_link.integrity_transformation = None
        mock_link.final_table_name = None
        mock_load.return_value = (mock_link, MagicMock())
        mock_resolve_cols.return_value = ([], None)
        mock_detect_proj.return_value = None

        data_session = MagicMock()
        data_session.scalar.return_value = 0
        datafeeder_session = MagicMock()

        table_id = uuid4()
        config = StagingMetadata(
            columns=[],
            title="Parcelles",
            file_type=None,
            join=Join(
                table_id=table_id,
                left_column="postal_code",
                right_column="code",
                columns=[JoinColumn(column_name="city")],
            ),
        )

        result = edit_staging_metadata(
            data_session=data_session,
            datafeeder_session=datafeeder_session,
            geo_ctx=MagicMock(),
            integrity_link_id=str(uuid4()),
            group_ids=[],
            config=config,
        )

        assert mock_link.integrity_transformation["join"] == {
            "table_id": str(table_id),
            "left_column": "postal_code",
            "right_column": "code",
            "columns": [{"column_name": "city"}],
        }
        assert result.join == config.join
