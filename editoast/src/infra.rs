use crate::error::Result;
use crate::generated_data;
use crate::infra_cache::InfraCache;
use crate::tables::osrd_infra_infra;
use crate::tables::osrd_infra_infra::dsl;
use chrono::{NaiveDateTime, Utc};
use diesel::result::Error as DieselError;
use diesel::sql_types::{BigInt, Bool, Nullable, Text};
use diesel::ExpressionMethods;
use diesel::{delete, sql_query, update, PgConnection, QueryDsl, RunQueryDsl};
use editoast_derive::EditoastError;
use serde::{Deserialize, Serialize};
use thiserror::Error;

pub const RAILJSON_VERSION: &str = "3.2.0";

#[derive(Clone, QueryableByName, Queryable, Debug, Serialize, Deserialize, Identifiable)]
#[diesel(table_name = osrd_infra_infra)]
pub struct Infra {
    pub id: i64,
    pub name: String,
    pub railjson_version: String,
    pub version: String,
    pub generated_version: Option<String>,
    pub locked: bool,
    pub created: NaiveDateTime,
    pub modified: NaiveDateTime,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct InfraName {
    pub name: String,
}

#[derive(Debug, Error, EditoastError)]
#[editoast_error(base_id = "infra")]
pub enum InfraApiError {
    /// Couldn't find the infra with the given id
    #[error("Infra '{infra_id}', could not be found")]
    #[editoast_error(status = 404)]
    NotFound { infra_id: i64 },
}

impl Infra {
    pub fn retrieve(conn: &mut PgConnection, infra_id: i64) -> Result<Infra> {
        match dsl::osrd_infra_infra.find(infra_id).first(conn) {
            Ok(infra) => Ok(infra),
            Err(DieselError::NotFound) => Err(InfraApiError::NotFound { infra_id }.into()),
            Err(e) => Err(e.into()),
        }
    }

    pub fn retrieve_for_update(conn: &mut PgConnection, infra_id: i64) -> Result<Infra> {
        match dsl::osrd_infra_infra
            .for_update()
            .find(infra_id)
            .first(conn)
        {
            Ok(infra) => Ok(infra),
            Err(DieselError::NotFound) => Err(InfraApiError::NotFound { infra_id }.into()),
            Err(e) => Err(e.into()),
        }
    }

    pub fn rename(conn: &mut PgConnection, infra_id: i64, new_name: String) -> Result<Infra> {
        match update(dsl::osrd_infra_infra.filter(dsl::id.eq(infra_id)))
            .set(dsl::name.eq(new_name))
            .get_result::<Infra>(conn)
        {
            Ok(infra) => Ok(infra),
            Err(DieselError::NotFound) => Err(InfraApiError::NotFound { infra_id }.into()),
            Err(err) => Err(err.into()),
        }
    }

    pub fn list(conn: &mut PgConnection) -> Vec<Infra> {
        dsl::osrd_infra_infra
            .load::<Self>(conn)
            .expect("List infra query failed")
    }

    pub fn list_for_update(conn: &mut PgConnection) -> Vec<Infra> {
        dsl::osrd_infra_infra
            .for_update()
            .load::<Self>(conn)
            .expect("List infra query failed")
    }

    pub fn bump_version(&self, conn: &mut PgConnection) -> Result<Self> {
        let new_version = self
            .version
            .parse::<u32>()
            .expect("Cannot convert version into an Integer")
            + 1;

        match update(dsl::osrd_infra_infra.filter(dsl::id.eq(self.id)))
            .set(dsl::version.eq(new_version.to_string()))
            .get_result::<Infra>(conn)
        {
            Ok(infra) => Ok(infra),
            Err(DieselError::NotFound) => Err(InfraApiError::NotFound { infra_id: self.id }.into()),
            Err(err) => Err(err.into()),
        }
    }

    pub fn bump_generated_version(&self, conn: &mut PgConnection) -> Result<Self> {
        match update(dsl::osrd_infra_infra.filter(dsl::id.eq(self.id)))
            .set(dsl::generated_version.eq(&self.version))
            .get_result::<Infra>(conn)
        {
            Ok(infra) => Ok(infra),
            Err(DieselError::NotFound) => Err(InfraApiError::NotFound { infra_id: self.id }.into()),
            Err(err) => Err(err.into()),
        }
    }

    pub fn downgrade_generated_version(&self, conn: &mut PgConnection) -> Result<Self> {
        match update(dsl::osrd_infra_infra.filter(dsl::id.eq(self.id)))
            .set(dsl::generated_version.eq::<Option<String>>(None))
            .get_result::<Infra>(conn)
        {
            Ok(infra) => Ok(infra),
            Err(DieselError::NotFound) => Err(InfraApiError::NotFound { infra_id: self.id }.into()),
            Err(err) => Err(err.into()),
        }
    }

    pub fn update_modified_timestamp_to_now(&self, conn: &mut PgConnection) -> Result<Self> {
        match update(dsl::osrd_infra_infra.filter(dsl::id.eq(self.id)))
            .set(dsl::modified.eq(Utc::now().naive_utc()))
            .get_result::<Infra>(conn)
        {
            Ok(infra) => Ok(infra),
            Err(DieselError::NotFound) => Err(InfraApiError::NotFound { infra_id: self.id }.into()),
            Err(err) => Err(err.into()),
        }
    }

    pub fn create<T: AsRef<str>>(infra_name: T, conn: &mut PgConnection) -> Result<Infra> {
        match sql_query(
            "INSERT INTO osrd_infra_infra (name, railjson_version, owner, version, generated_version, locked, created, modified
            )
             VALUES ($1, $2, '00000000-0000-0000-0000-000000000000', '0', '0', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING *",
        )
        .bind::<Text, _>(infra_name.as_ref())
        .bind::<Text, _>(RAILJSON_VERSION)
        .get_result::<Infra>(conn)
        {
            Ok(infra) => Ok(infra),
            Err(err) => Err(err.into()),
        }
    }

    pub fn delete(infra_id: i64, conn: &mut PgConnection) -> Result<()> {
        match delete(dsl::osrd_infra_infra.filter(dsl::id.eq(infra_id))).execute(conn) {
            Ok(1) => Ok(()),
            Ok(_) => Err(InfraApiError::NotFound { infra_id }.into()),
            Err(err) => Err(err.into()),
        }
    }

    pub fn clone(infra_id: i64, conn: &mut PgConnection, new_name: String) -> Result<Infra> {
        let infra_to_clone = Infra::retrieve(conn, infra_id)?;
        match sql_query(
            "INSERT INTO osrd_infra_infra (name, railjson_version, owner, version, generated_version, locked, created, modified
            )
            SELECT $1, $2, '00000000-0000-0000-0000-000000000000', $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM osrd_infra_infra
             WHERE id = $6
             RETURNING *",
        )
        .bind::<Text, _>(new_name)
        .bind::<Text, _>(RAILJSON_VERSION)
        .bind::<Text,_>(infra_to_clone.version)
        .bind::<Nullable<Text>,_>(infra_to_clone.generated_version)
        .bind::<Bool,_>(infra_to_clone.locked)
        .bind::<BigInt,_>(infra_id)
        .get_result::<Infra>(conn)
        {
            Ok(infra) => Ok(infra),
            Err(err) => Err(err.into()),
        }
    }

    /// Lock or unlock the infra whether `lock` is true or false
    pub fn set_locked(&self, lock: bool, conn: &mut PgConnection) -> Result<Self> {
        match update(dsl::osrd_infra_infra.filter(dsl::id.eq(self.id)))
            .set(dsl::locked.eq(lock))
            .get_result::<Infra>(conn)
        {
            Ok(infra) => Ok(infra),
            Err(DieselError::NotFound) => Err(InfraApiError::NotFound { infra_id: self.id }.into()),
            Err(err) => Err(err.into()),
        }
    }

    /// Refreshes generated data if not up to date and returns whether they were refreshed.
    /// `force` argument allows us to refresh it in any cases.
    /// This function will update `generated_version` accordingly.
    /// If refreshed you need to call `invalidate_after_refresh` to invalidate layer cache
    pub fn refresh(
        &self,
        conn: &mut PgConnection,
        force: bool,
        infra_cache: &InfraCache,
    ) -> Result<bool> {
        // Check if refresh is needed
        if !force
            && self.generated_version.is_some()
            && &self.version == self.generated_version.as_ref().unwrap()
        {
            return Ok(false);
        }

        generated_data::refresh_all(conn, self.id, infra_cache)?;

        // Update generated infra version
        self.bump_generated_version(conn)?;
        Ok(true)
    }

    /// Clear generated data of the infra
    /// This function will update `generated_version` acordingly.
    pub fn clear(&self, conn: &mut PgConnection) -> Result<bool> {
        generated_data::clear_all(conn, self.id)?;
        self.downgrade_generated_version(conn)?;
        Ok(true)
    }
}

#[cfg(test)]
pub mod tests {
    use super::Infra;
    use crate::client::PostgresConfig;
    use actix_web::http::StatusCode;
    use actix_web::ResponseError;
    use diesel::result::Error;
    use diesel::{Connection, PgConnection};

    pub fn test_infra_transaction(fn_test: fn(&mut PgConnection, Infra)) {
        let mut conn = PgConnection::establish(&PostgresConfig::default().url()).unwrap();
        conn.test_transaction::<_, Error, _>(|conn| {
            let infra = Infra::create("test", conn).unwrap();

            fn_test(conn, infra);
            Ok(())
        });
    }

    #[test]
    fn create_infra() {
        test_infra_transaction(|_, infra| {
            assert_eq!("test", infra.name);
        });
    }

    #[test]
    fn delete_infra() {
        test_infra_transaction(|conn, infra| {
            assert!(Infra::delete(infra.id, conn).is_ok());
            let err = Infra::delete(infra.id, conn).unwrap_err();
            assert_eq!(err.status_code(), StatusCode::NOT_FOUND);
        });
    }

    #[test]
    fn update_infra_name() {
        test_infra_transaction(|conn, infra| {
            let new_name = "new_name";
            let updated_infra = Infra::rename(conn, infra.id, new_name.into()).unwrap();
            assert_eq!(new_name, updated_infra.name);
        });
    }

    #[test]
    fn downgrade_version() {
        let mut conn = PgConnection::establish(&PostgresConfig::default().url()).unwrap();
        let infra = Infra::create("test", &mut conn).unwrap();
        assert!(infra
            .downgrade_generated_version(&mut conn)
            .unwrap()
            .generated_version
            .is_none())
    }
}
