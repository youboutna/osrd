use crate::error::Result;
use crate::models::train_schedule::TrainScheduleDetails;
use crate::models::Delete;
use crate::tables::osrd_infra_scenario;
use crate::views::pagination::Paginate;
use crate::views::pagination::PaginatedResponse;
use crate::DbPool;
use actix_web::web::{block, Data};
use chrono::{NaiveDateTime, Utc};
use derivative::Derivative;
use diesel::result::Error as DieselError;
use diesel::sql_query;
use diesel::sql_types::{Array, BigInt, Nullable, Text};
use diesel::{delete, QueryDsl};
use diesel::{ExpressionMethods, RunQueryDsl};
use editoast_derive::Model;
use serde::{Deserialize, Serialize};

#[derive(
    Clone,
    Debug,
    Serialize,
    Deserialize,
    Insertable,
    Derivative,
    Queryable,
    QueryableByName,
    AsChangeset,
    Identifiable,
    Model,
)]
#[derivative(Default)]
#[model(table = "osrd_infra_scenario")]
#[model(create, retrieve, update)]
#[diesel(table_name = osrd_infra_scenario)]
pub struct Scenario {
    #[diesel(deserialize_as = i64)]
    pub id: Option<i64>,
    #[diesel(deserialize_as = i64)]
    #[diesel(column_name = "study_id")]
    pub study: Option<i64>,
    #[diesel(deserialize_as = i64)]
    #[diesel(column_name = "infra_id")]
    pub infra: Option<i64>,
    #[diesel(deserialize_as = Option<i64>)]
    #[diesel(column_name = "electrical_profile_set_id")]
    pub electrical_profile_set: Option<Option<i64>>,
    #[diesel(deserialize_as = i64)]
    #[diesel(column_name = "timetable_id")]
    pub timetable: Option<i64>,
    #[diesel(deserialize_as = String)]
    pub name: Option<String>,
    #[diesel(deserialize_as = String)]
    pub description: Option<String>,
    #[diesel(deserialize_as = NaiveDateTime)]
    pub creation_date: Option<NaiveDateTime>,
    #[derivative(Default(value = "Utc::now().naive_utc()"))]
    pub last_modification: NaiveDateTime,
    #[diesel(deserialize_as = Vec<String>)]
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, QueryableByName)]
pub struct ScenarioWithDetails {
    #[serde(flatten)]
    #[diesel(embed)]
    pub scenario: Scenario,
    #[diesel(sql_type = Text)]
    pub infra_name: String,
    #[diesel(sql_type = Nullable<Text>)]
    pub electrical_profile_set_name: Option<String>,
    #[diesel(sql_type = Array<TrainScheduleDetails>)]
    pub train_schedules: Vec<TrainScheduleDetails>,
    #[diesel(sql_type = BigInt)]
    pub trains_count: i64,
}

#[derive(Debug, Clone, Serialize, QueryableByName)]
pub struct ScenarioWithCountTrains {
    #[serde(flatten)]
    #[diesel(embed)]
    pub scenario: Scenario,
    #[diesel(sql_type = BigInt)]
    pub trains_count: i64,
}

impl Scenario {
    pub async fn with_details(self, db_pool: Data<DbPool>) -> Result<ScenarioWithDetails> {
        block::<_, Result<_>>(move || {
            use crate::tables::osrd_infra_electricalprofileset::dsl as elec_dsl;
            use crate::tables::osrd_infra_infra::dsl as infra_dsl;
            use crate::tables::osrd_infra_trainschedule::dsl::*;
            let mut conn = db_pool.get()?;
            let infra_name = infra_dsl::osrd_infra_infra
                .filter(infra_dsl::id.eq(self.infra.unwrap()))
                .select(infra_dsl::name)
                .first::<String>(&mut conn)?;

            let electrical_profile_set_name = match self.electrical_profile_set.unwrap() {
                Some(electrical_profile_set) => Some(
                    elec_dsl::osrd_infra_electricalprofileset
                        .filter(elec_dsl::id.eq(electrical_profile_set))
                        .select(elec_dsl::name)
                        .first::<String>(&mut conn)?,
                ),
                None => None,
            };

            let train_schedules = osrd_infra_trainschedule
                .filter(timetable_id.eq(self.timetable.unwrap()))
                .select((id, train_name, departure_time, path_id))
                .load::<TrainScheduleDetails>(&mut conn)?;

            let trains_count = train_schedules.len() as i64;

            Ok(ScenarioWithDetails {
                scenario: self,
                infra_name,
                electrical_profile_set_name,
                train_schedules,
                trains_count,
            })
        })
        .await
        .unwrap()
    }

    pub async fn list(
        db_pool: Data<DbPool>,
        page: i64,
        per_page: i64,
        study_id: i64,
    ) -> Result<PaginatedResponse<ScenarioWithCountTrains>> {
        sql_query(
            "SELECT scenario.*,COUNT(trainschedule.id) as trains_count FROM osrd_infra_scenario scenario
            LEFT JOIN osrd_infra_trainschedule trainschedule ON scenario.timetable_id = trainschedule.timetable_id WHERE scenario.study_id = $1
            GROUP BY scenario.id"
        ).bind::<BigInt,_>(study_id)
        .paginate(page)
        .per_page(per_page)
        .load_and_count(db_pool)
        .await
    }
}
/// Delete a scenario.
/// When we delete a scenario, the associated timetable is deleted too.
impl Delete for Scenario {
    fn delete_conn(conn: &mut diesel::PgConnection, scenario_id: i64) -> Result<bool> {
        use crate::tables::osrd_infra_scenario::dsl as scenario_dsl;
        use crate::tables::osrd_infra_timetable::dsl as timetable_dsl;

        // Delete scenario
        let scenario = match delete(
            scenario_dsl::osrd_infra_scenario.filter(scenario_dsl::id.eq(scenario_id)),
        )
        .get_result::<Scenario>(conn)
        {
            Ok(scenario) => scenario,
            Err(DieselError::NotFound) => return Ok(false),
            Err(err) => return Err(err.into()),
        };

        // Delete timetable
        delete(
            timetable_dsl::osrd_infra_timetable
                .filter(timetable_dsl::id.eq(scenario.timetable.unwrap())),
        )
        .execute(conn)?;
        Ok(true)
    }
}

#[cfg(test)]
pub mod test {

    use crate::client::PostgresConfig;
    use crate::infra::Infra;
    use crate::models::projects::test::build_test_project;
    use crate::models::study::test::build_test_study;
    use crate::models::Create;
    use crate::models::Delete;
    use crate::models::Retrieve;
    use crate::models::Timetable;
    use crate::models::{Project, Study};
    use actix_web::test as actix_test;
    use actix_web::web::Data;
    use chrono::Utc;
    use diesel::r2d2::{ConnectionManager, Pool};
    use diesel::Connection;
    use diesel::PgConnection;

    use super::Scenario;

    fn build_test_scenario(study_id: i64, infra_id: i64, timetable_id: i64) -> Scenario {
        Scenario {
            name: Some("test".into()),
            study: Some(study_id),
            infra: Some(infra_id),
            description: Some("test".into()),
            timetable: Some(timetable_id),
            creation_date: Some(Utc::now().naive_utc()),
            tags: Some(vec![]),
            electrical_profile_set: None,
            ..Default::default()
        }
    }

    #[actix_test]
    async fn create_delete_scenario() {
        let project = build_test_project();
        let manager = ConnectionManager::<PgConnection>::new(PostgresConfig::default().url());
        let pool = Data::new(Pool::builder().max_size(1).build(manager).unwrap());

        // Create a project
        let project = project.create(pool.clone()).await.unwrap();
        let project_id = project.id.unwrap();

        // Create a study
        let study = build_test_study(project_id);
        let study: Study = study.create(pool.clone()).await.unwrap();
        let study_id = study.id.unwrap();

        // Create an infra
        let mut conn = PgConnection::establish(&PostgresConfig::default().url()).unwrap();
        let infra: Infra = Infra::create("infra_test", &mut conn).unwrap();

        // Create a timetable
        let timetable = Timetable {
            id: None,
            name: Some("timetable_test".into()),
        };
        let timetable: Timetable = timetable.create(pool.clone()).await.unwrap();

        // Create a scenario
        let scenario = build_test_scenario(study_id, infra.id, timetable.id.unwrap());
        let scenario: Scenario = scenario.create(pool.clone()).await.unwrap();
        let scenario_id = scenario.id.unwrap();

        // Delete the scenario
        Scenario::delete(pool.clone(), scenario_id).await.unwrap();
        Project::delete(pool.clone(), project_id).await.unwrap();

        // Second delete should fail
        assert!(!Scenario::delete(pool.clone(), scenario_id).await.unwrap());
    }

    #[actix_test]
    async fn get_study() {
        let project = build_test_project();
        let manager = ConnectionManager::<PgConnection>::new(PostgresConfig::default().url());
        let pool = Data::new(Pool::builder().max_size(1).build(manager).unwrap());

        // Create a project
        let project = project.create(pool.clone()).await.unwrap();
        let project_id = project.id.unwrap();

        // Create a study
        let study = build_test_study(project_id);
        let study: Study = study.create(pool.clone()).await.unwrap();
        let study_id = study.id.unwrap();

        // Create an infra
        let mut conn = PgConnection::establish(&PostgresConfig::default().url()).unwrap();
        let infra: Infra = Infra::create("infra_test", &mut conn).unwrap();

        // Create a timetable
        let timetable = Timetable {
            id: None,
            name: Some("timetable_test".into()),
        };
        let timetable: Timetable = timetable.create(pool.clone()).await.unwrap();

        // Create a scenario
        let scenario = build_test_scenario(study_id, infra.id, timetable.id.unwrap());
        let scenario: Scenario = scenario.create(pool.clone()).await.unwrap();
        let scenario_id = scenario.id.unwrap();

        // Get a scenario
        assert!(Scenario::retrieve(pool.clone(), study_id).await.is_ok());
        assert!(Scenario::list(pool.clone(), 1, 25, study_id).await.is_ok());

        // Delete the scenario
        Scenario::delete(pool.clone(), scenario_id).await.unwrap();
        Project::delete(pool.clone(), project_id).await.unwrap();
    }
}
