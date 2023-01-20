use diesel::delete;
use diesel::query_dsl::methods::FilterDsl;
use diesel::result::Error;
use diesel::sql_types::{Array, BigInt, Text};
use diesel::{sql_query, PgConnection, RunQueryDsl};
use std::iter::Iterator;

use super::utils::InvolvedObjects;
use super::GeneratedData;
use crate::diesel::ExpressionMethods;
use crate::infra_cache::InfraCache;
use crate::schema::ObjectType;
use crate::tables::osrd_infra_tracksectionlayer::dsl;

pub struct TrackSectionLayer;

impl GeneratedData for TrackSectionLayer {
    fn table_name() -> &'static str {
        "osrd_infra_tracksectionlayer"
    }

    fn generate(
        conn: &mut PgConnection,
        infra: i64,
        _infra_cache: &InfraCache,
    ) -> Result<(), Error> {
        sql_query(include_str!("sql/generate_track_section_layer.sql"))
            .bind::<BigInt, _>(infra)
            .execute(conn)?;
        Ok(())
    }

    fn update(
        conn: &mut PgConnection,
        infra: i64,
        operations: &[crate::schema::operation::OperationResult],
        infra_cache: &crate::infra_cache::InfraCache,
    ) -> Result<(), Error> {
        let involved_objects =
            InvolvedObjects::from_operations(operations, infra_cache, ObjectType::TrackSection);

        // Delete elements
        if !involved_objects.deleted.is_empty() {
            delete(
                dsl::osrd_infra_tracksectionlayer
                    .filter(dsl::infra_id.eq(infra))
                    .filter(dsl::obj_id.eq_any(involved_objects.deleted)),
            )
            .execute(conn)?;
        }

        // Update elements
        if !involved_objects.updated.is_empty() {
            sql_query(include_str!("sql/insert_update_track_section_layer.sql"))
                .bind::<BigInt, _>(infra)
                .bind::<Array<Text>, _>(involved_objects.updated.into_iter().collect::<Vec<_>>())
                .execute(conn)?;
        }
        Ok(())
    }
}
