import mapboxgl from 'mapbox-gl';
import React, { ComponentType, FC, useContext, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Popup } from 'react-map-gl';
import { useTranslation } from 'react-i18next';
import { featureCollection } from '@turf/helpers';
import { merge, isEqual } from 'lodash';
import along from '@turf/along';
import { BiArrowFromLeft, BiArrowToRight } from 'react-icons/bi';
import { BsBoxArrowInRight } from 'react-icons/bs';

import GeoJSONs, { EditorSource, SourcesDefinitionsIndex } from 'common/Map/Layers/GeoJSONs';
import colors from 'common/Map/Consts/colors';
import { save } from 'reducers/editor';
import { getInfraID } from 'reducers/osrdconf/selectors';
import {
  NULL_GEOMETRY,
  CreateEntityOperation,
  EditorEntity,
  TrackSectionEntity,
  RouteEntity,
} from 'types';
import { SIGNALS_TO_SYMBOLS } from 'common/Map/Consts/SignalsNames';
import { PointEditionState } from './types';
import EditorForm from '../../components/EditorForm';
import { cleanSymbolType, flattenEntity, NEW_ENTITY_ID } from '../../data/utils';
import { EditoastType, EditorContextType, ExtendedEditorContextType } from '../types';
import EditorContext from '../../context';
import EntitySumUp from '../../components/EntitySumUp';
import { getEntities, getEntity, getRoutesFromWaypoint } from '../../data/api';
import { Spinner } from '../../../../common/Loader';
import RouteEditionTool from '../routeEdition/tool';
import { getEditRouteState } from '../routeEdition/utils';
import { getMapStyle } from '../../../../reducers/map/selectors';

export const POINT_LAYER_ID = 'pointEditionTool/new-entity';

/**
 * Generic component to show routes starting or ending from the edited waypoint:
 */
export const RoutesList: FC<{ type: EditoastType; id: string }> = ({ type, id }) => {
  const { t } = useTranslation();
  const infraID = useSelector(getInfraID);
  const [routesState, setRoutesState] = useState<
    | { type: 'idle' }
    | { type: 'loading' }
    | { type: 'ready'; starting: RouteEntity[]; ending: RouteEntity[] }
    | { type: 'error'; message: string }
  >({ type: 'idle' });
  const { switchTool } = useContext(EditorContext) as ExtendedEditorContextType<unknown>;

  useEffect(() => {
    if (routesState.type === 'idle') {
      setRoutesState({ type: 'loading' });
      getRoutesFromWaypoint(`${infraID}`, type, id)
        .then((res) => {
          const starting = res.starting || [];
          const ending = res.ending || [];

          if (starting.length || ending.length) {
            getEntities<RouteEntity>(`${infraID}`, [...starting, ...ending], 'Route')
              .then((entities) => {
                setRoutesState({
                  type: 'ready',
                  starting: starting.map((routeId) => entities[routeId]),
                  ending: ending.map((routeId) => entities[routeId]),
                });
              })
              .catch((err) => {
                setRoutesState({ type: 'error', message: err.message });
              });
          } else {
            setRoutesState({ type: 'ready', starting: [], ending: [] });
          }
        })
        .catch((err) => {
          setRoutesState({ type: 'error', message: err.message });
        });
    }
  }, [routesState]);

  useEffect(() => {
    setRoutesState({ type: 'idle' });
  }, [type, id]);

  if (routesState.type === 'loading' || routesState.type === 'idle')
    return (
      <div className="loader mt-1">
        <Spinner />
      </div>
    );
  if (routesState.type === 'error')
    return (
      <div className="form-error mt-3 mb-3">
        <p>{routesState.message || t('Editor.tools.point-edition.default-routes-error')}</p>
      </div>
    );

  return (
    <>
      {!!routesState.starting.length && (
        <div>
          <h4>
            <BiArrowFromLeft className="me-1" />{' '}
            {t('Editor.tools.point-edition.routes-starting-from')}
          </h4>
          <ul className="list-unstyled">
            {routesState.starting.map((route) => (
              <li key={route.properties.id} className="d-flex align-items-center">
                <div className="flex-shrink-0 mr-3">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    title={t('common.open')}
                    onClick={() => {
                      switchTool(RouteEditionTool, getEditRouteState(route));
                    }}
                  >
                    <BsBoxArrowInRight />
                  </button>
                </div>
                <div className="flex-grow-1 flex-shrink-1">
                  <EntitySumUp entity={route} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!!routesState.ending.length && (
        <div>
          <h4>
            <BiArrowToRight className="me-1" /> {t('Editor.tools.point-edition.routes-ending-at')}
          </h4>
          <ul className="list-unstyled">
            {routesState.ending.map((route) => (
              <li key={route.properties.id} className="d-flex align-items-center">
                <div className="flex-shrink-0 mr-3">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    title={t('common.open')}
                    onClick={() => {
                      switchTool(RouteEditionTool, getEditRouteState(route));
                    }}
                  >
                    <BsBoxArrowInRight />
                  </button>
                </div>
                <div className="flex-grow-1 flex-shrink-1">
                  <EntitySumUp entity={route} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!(routesState.starting.length + routesState.ending.length) && (
        <div className="text-center">{t('Editor.tools.point-edition.no-linked-route')}</div>
      )}
    </>
  );
};

/**
 * Generic component for point edition left panel:
 */
export const PointEditionLeftPanel: FC<{ type: EditoastType }> = <Entity extends EditorEntity>({
  type,
}: {
  type: EditoastType;
}) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const infraID = useSelector(getInfraID);
  const { state, setState } = useContext(EditorContext) as ExtendedEditorContextType<
    PointEditionState<Entity>
  >;
  const isWayPoint = type === 'BufferStop' || type === 'Detector';
  const isNew =
    typeof state.entity.properties.id === 'string' && state.entity.properties.id === NEW_ENTITY_ID;

  const [trackState, setTrackState] = useState<
    | { type: 'idle'; id?: undefined; track?: undefined }
    | { type: 'isLoading'; id: string; track?: undefined }
    | { type: 'ready'; id: string; track: TrackSectionEntity }
  >({ type: 'idle' });

  useEffect(() => {
    const firstLoading = trackState.type === 'idle';
    const trackId = state.entity.properties.track as string | undefined;

    if (trackId && trackState.id !== trackId) {
      setTrackState({ type: 'isLoading', id: trackId });
      getEntity<TrackSectionEntity>(infraID as number, trackId, 'TrackSection').then((track) => {
        setTrackState({ type: 'ready', id: trackId, track });

        if (!firstLoading) {
          const { position } = state.entity.properties;
          const point = along(track, position, { units: 'meters' });

          setState({ ...state, entity: { ...state.entity, geometry: point.geometry } });
        }
      });
    }
  }, [infraID, setState, state, state.entity.properties.track, trackState.id, trackState.type]);

  return (
    <>
      {isWayPoint && !isNew && (
        <>
          <h3>{t('Editor.tools.point-edition.linked-routes')}</h3>
          <RoutesList type={type} id={state.entity.properties.id} />
          <div className="border-bottom" />
        </>
      )}
      <EditorForm
        data={state.entity as Entity}
        onSubmit={async (savedEntity) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res: any = await dispatch(
            save(
              state.entity.properties.id !== NEW_ENTITY_ID
                ? {
                    update: [
                      {
                        source: state.initialEntity,
                        target: savedEntity,
                      },
                    ],
                  }
                : { create: [savedEntity] }
            )
          );
          const operation = res[0] as CreateEntityOperation;
          const { id } = operation.railjson;
          if (id && id !== savedEntity.properties.id) {
            setState({
              ...state,
              entity: {
                ...state.entity,
                id,
                properties: {
                  ...state.entity.properties,
                  ...operation.railjson,
                },
              },
            });
          }
        }}
        onChange={(entity) => {
          const additionalUpdate: Partial<Entity> = {};

          const newPosition = entity.properties?.position;
          const oldPosition = state.entity.properties?.position;
          const trackId = entity.properties?.track;
          if (
            typeof trackId === 'string' &&
            trackId === trackState.id &&
            trackState.type === 'ready' &&
            typeof newPosition === 'number' &&
            typeof oldPosition === 'number' &&
            newPosition !== oldPosition
          ) {
            const point = along(trackState.track, newPosition, { units: 'meters' });
            additionalUpdate.geometry = point.geometry;
          }

          setState({ ...state, entity: { ...(entity as Entity), ...additionalUpdate } });
        }}
      >
        <div className="text-right">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!state.entity.properties?.track || !state.entity.geometry}
          >
            {t('common.save')}
          </button>
        </div>
      </EditorForm>
    </>
  );
};

export const getPointEditionLeftPanel =
  (type: EditoastType): ComponentType =>
  () =>
    <PointEditionLeftPanel type={type} />;

export const BasePointEditionLayers: FC<{
  // eslint-disable-next-line react/no-unused-prop-types
  map: mapboxgl.Map;
  mergeEntityWithNearestPoint?: (
    entity: EditorEntity,
    nearestPoint: NonNullable<PointEditionState<EditorEntity>['nearestPoint']>
  ) => EditorEntity;
  interactiveLayerIDRegex?: RegExp;
}> = ({ mergeEntityWithNearestPoint, interactiveLayerIDRegex }) => {
  const {
    renderingFingerprint,
    state: { nearestPoint, mousePosition, entity, objType },
    editorState: { editorLayers },
  } = useContext(EditorContext) as ExtendedEditorContextType<PointEditionState<EditorEntity>>;
  const mapStyle = useSelector(getMapStyle);

  const [showPopup, setShowPopup] = useState(true);

  const renderedEntity = useMemo(() => {
    let res: EditorEntity | null = null;
    if (entity.geometry && !isEqual(entity.geometry, NULL_GEOMETRY)) {
      res = entity as EditorEntity;
    } else if (nearestPoint) {
      if (mergeEntityWithNearestPoint) {
        res = mergeEntityWithNearestPoint(entity, nearestPoint);
      } else {
        res = {
          ...entity,
          geometry: nearestPoint.feature.geometry,
          properties: entity.properties,
        };
      }
    } else if (mousePosition) {
      res = { ...entity, geometry: { type: 'Point', coordinates: mousePosition } };
    }

    return res;
  }, [entity, mergeEntityWithNearestPoint, mousePosition, nearestPoint]);

  const flatRenderedEntity = useMemo(
    () => (renderedEntity ? flattenEntity(renderedEntity) : null),
    [renderedEntity]
  );

  const type = cleanSymbolType((entity.properties || {}).extensions?.sncf?.installation_type || '');
  const layers = useMemo(
    () =>
      SourcesDefinitionsIndex[objType](
        {
          prefix: '',
          colors: colors[mapStyle],
          signalsList: [type],
          symbolsList: SIGNALS_TO_SYMBOLS[type] || [],
          sourceLayer: 'geo',
          isEmphasized: true,
          showIGNBDORTHO: false,
        },
        `editor/${objType}/`
      ).map((layer) =>
        // Quick hack to keep a proper interactive layer:
        layer?.id?.match(interactiveLayerIDRegex || /-main$/)
          ? { ...layer, id: POINT_LAYER_ID }
          : layer
      ),
    [interactiveLayerIDRegex, mapStyle, objType, type]
  );

  return (
    <>
      {/* Editor data layer */}
      <GeoJSONs
        colors={colors[mapStyle]}
        hidden={entity.properties.id !== NEW_ENTITY_ID ? [entity.properties.id] : undefined}
        layers={editorLayers}
        fingerprint={renderingFingerprint}
      />

      {/* Edited entity */}
      <EditorSource layers={layers} data={flatRenderedEntity || featureCollection([])} />
      {showPopup && renderedEntity && renderedEntity.geometry.type === 'Point' && (
        <Popup
          className="popup py-2"
          anchor="bottom"
          longitude={renderedEntity.geometry.coordinates[0]}
          latitude={renderedEntity.geometry.coordinates[1]}
          onClose={() => setShowPopup(false)}
        >
          <EntitySumUp entity={renderedEntity} status="edited" />
        </Popup>
      )}
    </>
  );
};

export const SignalEditionLayers: FC<{ map: mapboxgl.Map }> = ({ map }) => (
  <BasePointEditionLayers
    map={map}
    interactiveLayerIDRegex={/signal-point$/}
    mergeEntityWithNearestPoint={(entity, nearestPoint) => ({
      ...entity,
      geometry: nearestPoint.feature.geometry,
      properties: {
        ...merge(entity.properties, {
          extensions: {
            sncf: {
              angle_geo: nearestPoint.angle,
            },
          },
        }),
      },
    })}
  />
);

export const PointEditionMessages: FC = () => {
  const { t, state } = useContext(EditorContext) as EditorContextType<
    PointEditionState<EditorEntity>
  >;

  if (!state.entity.geometry || isEqual(state.entity.geometry, NULL_GEOMETRY)) {
    return state.nearestPoint
      ? t(`Editor.tools.point-edition.help.stop-dragging-on-line`)
      : t(`Editor.tools.point-edition.help.stop-dragging-no-line`);
  }

  return t(`Editor.tools.point-edition.help.start-dragging`);
};
