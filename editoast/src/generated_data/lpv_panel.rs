use crate::infra_cache::InfraCache;
use crate::schema::ObjectType;

use super::utils::InvolvedObjects;
use super::GeneratedData;
use diesel::result::Error;
use diesel::sql_types::{Array, Integer, Text};
use diesel::{sql_query, PgConnection, RunQueryDsl};

pub struct LPVPanelLayer;

impl GeneratedData for LPVPanelLayer {
    fn table_name() -> &'static str {
        "osrd_infra_lpvpanellayer"
    }

    fn generate(conn: &PgConnection, infra: i32, _infra_cache: &InfraCache) -> Result<(), Error> {
        sql_query(include_str!("sql/generate_lpv_panel_layer.sql"))
            .bind::<Integer, _>(infra)
            .execute(conn)?;
        Ok(())
    }

    fn update(
        conn: &PgConnection,
        infra: i32,
        operations: &[crate::schema::operation::OperationResult],
        infra_cache: &crate::infra_cache::InfraCache,
    ) -> Result<(), Error> {
        let involved_objects =
            InvolvedObjects::from_operations(operations, infra_cache, ObjectType::SpeedSection);

        // Delete elements
        if !involved_objects.is_empty() {
            // We must delete both updated and deleted lpv panels because we can only insert them and not update
            let objs = involved_objects
                .deleted
                .iter()
                .chain(involved_objects.updated.iter());

            sql_query(format!(
                "DELETE FROM {} WHERE infra_id = $1 AND obj_id = ANY($2)",
                Self::table_name()
            ))
            .bind::<Integer, _>(infra)
            .bind::<Array<Text>, _>(objs.into_iter().collect::<Vec<_>>())
            .execute(conn)?;
        }

        // Insert involved elements
        if !involved_objects.updated.is_empty() {
            sql_query(include_str!("sql/insert_lpv_panel_layer.sql"))
                .bind::<Integer, _>(infra)
                .bind::<Array<Text>, _>(involved_objects.updated.into_iter().collect::<Vec<_>>())
                .execute(conn)?;
        }
        Ok(())
    }
}
