use crate::error::Result;
use crate::infra::Infra;
use crate::infra_cache::{InfraCache, ObjectCache};
use crate::map::Zone;

use crate::DbPool;
use actix_web::dev::HttpServiceFactory;
use actix_web::get;
use actix_web::web::{block, scope, Data, Json, Path};
use chashmap::CHashMap;
use editoast_derive::EditoastError;
use thiserror::Error;

/// Return `/infra/<infra_id>/lines` routes
pub fn routes() -> impl HttpServiceFactory {
    scope("/lines").service(get_line_bbox)
}

#[derive(Debug, Error, EditoastError)]
#[editoast_error(base_id = "infra:lines")]
enum LinesErrors {
    #[error("no line with code {line_code} found")]
    LineNotFound { line_code: i32 },
}

#[get("/{line_code}/bbox")]
async fn get_line_bbox(
    path: Path<(i64, i64)>,
    infra_caches: Data<CHashMap<i64, InfraCache>>,
    db_pool: Data<DbPool>,
) -> Result<Json<Zone>> {
    let (infra_id, line_code) = path.into_inner();
    let line_code: i32 = line_code.try_into().unwrap();
    let zone = block::<_, Result<_>>(move || {
        let conn = &mut db_pool.get()?;
        let infra = Infra::retrieve(conn, infra_id)?;
        let infra_cache = InfraCache::get_or_load(conn, &infra_caches, &infra)?;
        let mut zone = Zone::default();
        let mut tracksections = infra_cache
            .track_sections()
            .values()
            .map(ObjectCache::unwrap_track_section)
            .filter(|track| track.line_code.map_or(false, |code| code == line_code))
            .peekable();
        if tracksections.peek().is_none() {
            return Err(LinesErrors::LineNotFound { line_code }.into());
        }
        tracksections.for_each(|track| {
            zone.union(&Zone {
                geo: track.bbox_geo.clone(),
                sch: track.bbox_sch.clone(),
            });
        });
        Ok(zone)
    })
    .await
    .unwrap()?;
    Ok(Json(zone))
}
