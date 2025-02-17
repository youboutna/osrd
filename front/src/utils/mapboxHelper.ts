import bboxClip from '@turf/bbox-clip';
import { chunk, head, sortBy } from 'lodash';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import booleanIntersects from '@turf/boolean-intersects';
import bbox from '@turf/bbox';
import lineIntersect from '@turf/line-intersect';
import lineSlice from '@turf/line-slice';
import WebMercatorViewport from 'viewport-mercator-project';
import { ViewState } from 'react-map-gl';
import { BBox, Coord, featureCollection } from '@turf/helpers';
import {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  Point,
  MultiPoint,
  Position,
  Polygon,
} from 'geojson';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import nearestPoint, { NearestPoint } from '@turf/nearest-point';
import fnDistance from '@turf/distance';
import fnExplode from '@turf/explode';
import { Zone, MapLayerMouseEvent, MapboxGeoJSONFeature } from '../types';
import { getAngle } from '../applications/editor/data/utils';

/**
 * This helpers transforms a given Zone object to the related Feature object (mainly to use with
 * Turf).
 */
export function zoneToFeature(zone: Zone, close = false): Feature {
  switch (zone.type) {
    case 'rectangle': {
      const [[lat1, lon1], [lat2, lon2]] = zone.points;

      return {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [lat1, lon1],
              [lat2, lon1],
              [lat2, lon2],
              [lat1, lon2],
              [lat1, lon1],
            ],
          ],
        },
      };
    }
    case 'polygon': {
      return {
        type: 'Feature',
        properties: {},
        geometry: close
          ? {
              type: 'Polygon',
              coordinates: [[...zone.points, zone.points[0]]],
            }
          : {
              type: 'LineString',
              coordinates: zone.points,
            },
      };
    }
    default:
      throw new Error('Zone is neither a polygone, neither a rectangle');
  }
}

/**
 * Returns the BBox containing a given zone.
 */
export function zoneToBBox(zone: Zone): BBox {
  if (zone.type === 'rectangle') {
    const [[x1, y1], [x2, y2]] = zone.points;
    return [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)];
  }

  return bbox(zoneToFeature(zone, true));
}

/**
 * Helper to clip a line on a polygon.
 */
export function intersectPolygonLine(
  poly: Feature<Polygon>,
  line: Feature<LineString | MultiLineString>
): Feature<MultiLineString> | null {
  const lines: Position[][] =
    line.geometry.type === 'MultiLineString'
      ? line.geometry.coordinates
      : [line.geometry.coordinates];
  const res: Feature<MultiLineString> = {
    type: 'Feature',
    properties: line.properties,
    geometry: {
      type: 'MultiLineString',
      coordinates: [],
    },
  };

  lines.forEach((l) => {
    if (l.length < 2) return;

    const firstPoint: Point = { type: 'Point', coordinates: l[0] };
    const lastPoint: Point = { type: 'Point', coordinates: l[l.length - 1] };
    let intersections: Point[] = lineIntersect(
      { type: 'LineString', coordinates: l },
      poly
    ).features.map((f) => f.geometry);

    if (booleanPointInPolygon(firstPoint, poly)) intersections = [firstPoint].concat(intersections);
    if (booleanPointInPolygon(lastPoint, poly)) intersections.push(lastPoint);

    const splitters = chunk(intersections, 2).filter((pair) => pair.length === 2) as [
      Point,
      Point
    ][];

    splitters.forEach(([start, end]) => {
      res.geometry.coordinates.push(
        lineSlice(start.coordinates, end.coordinates, { type: 'LineString', coordinates: l })
          .geometry.coordinates
      );
    });
  });

  return res.geometry.coordinates.length ? res : null;
}

/**
 * This helper takes a Feature *or* a FeatureCollection and a bounding zone, and returns the input
 * Feature or FeatureCollection, but clipped inside the bounding zone. It filters out Points and
 * MultiPoints, and clips LineStrings and MultiLineStrings using @turf/bboxClip (when possible).
 */
export function clip<T extends Feature | FeatureCollection>(tree: T, zone: Zone): T | null {
  if (tree.type === 'FeatureCollection') {
    return {
      ...tree,
      features: (tree as FeatureCollection).features.flatMap((f) => {
        const res = clip(f, zone);
        if (!res) return [];
        return [res];
      }),
    };
  }

  if (tree.type === 'Feature') {
    const feature = tree as Feature;

    if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
      if (zone.type === 'polygon') {
        const clipped = intersectPolygonLine(
          zoneToFeature(zone, true) as Feature<Polygon>,
          feature as Feature<LineString | MultiLineString>
        );
        return clipped ? (clipped as T) : null;
      }

      const clipped = bboxClip(
        feature as Feature<LineString | MultiLineString>,
        zoneToBBox(zone)
      ) as Feature<LineString | MultiLineString>;
      return clipped.geometry.coordinates.length ? (clipped as T) : null;
    }

    const polygon = zoneToFeature(zone, true).geometry as Polygon;

    if (feature.geometry.type === 'Point') {
      return booleanPointInPolygon((feature as Feature<Point>).geometry.coordinates, polygon)
        ? tree
        : null;
    }

    if (feature.geometry.type === 'MultiPoint') {
      const res: Feature<MultiPoint> = {
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: feature.geometry.coordinates.filter((position) =>
            booleanPointInPolygon(position, polygon)
          ),
        },
      };

      return res.geometry.coordinates.length ? (res as T) : null;
    }
  }

  return tree;
}

/**
 * This helpers takes an array of GeoJSON objects (as the editor data we use) and a zone, and
 * returns a selection of all items in the given dataset intersecting with the given zone. If no
 * zone is given, selects everything instead.
 */
export function selectInZone<T extends Feature>(data: Array<T>, zone?: Zone): T[] {
  const items: T[] = [];
  const zoneFeature = zone && zoneToFeature(zone, true);

  data.forEach((geojson) => {
    if (!zoneFeature || booleanIntersects(geojson, zoneFeature)) {
      items.push(geojson);
    }
  });

  return items;
}

/**
 * This helpers takes a zone and a screen size and returns the smallest viewport that contains the
 * zone.
 */
export function getZoneViewport(
  zone: Zone,
  viewport?: { width: number; height: number }
): ViewState {
  const [minLng, minLat, maxLng, maxLat] = zoneToBBox(zone);
  const vp = new WebMercatorViewport(viewport);
  const { longitude, latitude, zoom } = vp.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    {
      padding: 40,
    }
  );

  return {
    latitude,
    longitude,
    zoom,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, left: 0, bottom: 0, right: 0 },
  };
}

/**
 * Given a list of points (as [lng, lat] point coordinates), returns the proper GeoJSON object to
 * draw a line joining them
 */
export function getLineGeoJSON(points: Position[]): Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: points,
    },
  };
}

/**
 * Given a list of lines or multilines and a specific position, returns the nearest point to that
 * position on any of those lines.
 */
export function getNearestPoint(
  lines: Feature<LineString | MultiLineString>[],
  coord: Coord
): NearestPoint {
  const nearestPoints: Feature<Point>[] = lines.map((line) => {
    const point = nearestPointOnLine(line, coord, { units: 'meters' });
    let angle = 0;
    if (line.geometry.type === 'LineString') {
      angle = getAngle(
        line.geometry.coordinates[point.properties.index as number],
        line.geometry.coordinates[(point.properties.index as number) + 1]
      );
    }
    if (line.geometry.type === 'MultiLineString' && line.geometry.coordinates.length > 0) {
      const linesOrderdByDistance = sortBy(line.geometry.coordinates, (lineA) => {
        const distA = nearestPointOnLine(
          { type: 'LineString', coordinates: lineA },
          point.geometry.coordinates
        );
        return distA.properties.dist;
      });
      angle = getAngle(
        linesOrderdByDistance[0][point.properties.index as number],
        linesOrderdByDistance[0][(point.properties.index as number) + 1]
      );
    }
    return {
      ...point,
      properties: {
        ...point.properties,
        ...line.properties,
        angleAtPoint: angle,
      },
    };
  });

  return nearestPoint(coord, featureCollection(nearestPoints));
}

/**
 * Given a Map MouseEvent, find the nearest feature from the position of the mouse.
 * @param e The MouseEvent
 * @param opts Option object where
 *   - layerIds ->  list of layer's id on which we search element
 *   - tolerance -> value in pixel to create the hitbox
 */
export function getMapMouseEventNearestFeature(
  e: MapLayerMouseEvent,
  opts?: { layersId?: string[]; tolerance?: number; excludeOsm?: boolean }
): { feature: MapboxGeoJSONFeature; nearest: number[]; distance: number } | null {
  const layers = opts?.layersId;
  const tolerance = opts?.tolerance || 15;
  const excludeOsm = opts?.excludeOsm || true;
  const { target: map, point } = e;
  const coord = e.lngLat.toArray();

  const features = map
    .queryRenderedFeatures(
      [
        [point.x - tolerance / 2, point.y - tolerance / 2],
        [point.x + tolerance / 2, point.y + tolerance / 2],
      ],
      { layers }
    )
    .filter((f) => (excludeOsm ? !f.layer.id.startsWith('osm') : true));

  const result = head(
    sortBy(
      features.map((feature) => {
        // Those features lack a proper "geometry", and have a "_geometry"
        // instead. This fixes it:
        feature = {
          ...feature,
          // eslint-disable-next-line no-underscore-dangle,@typescript-eslint/no-explicit-any
          geometry: feature.geometry || (feature as any)._geometry,
        };

        let distance = Infinity;
        let nearestFeaturePoint: Feature<Point> | null = null;
        switch (feature.geometry.type) {
          case 'Point': {
            nearestFeaturePoint = feature as Feature<Point>;
            // we boost point, otherwise when a point is on line, it's too hard to find it
            distance = 0.7 * fnDistance(coord, nearestFeaturePoint.geometry.coordinates);
            break;
          }
          case 'LineString': {
            nearestFeaturePoint = nearestPointOnLine(feature.geometry, coord);
            distance = fnDistance(coord, nearestFeaturePoint.geometry.coordinates);
            break;
          }
          case 'MultiPoint': {
            const points: FeatureCollection<Point> = {
              type: 'FeatureCollection',
              features: feature.geometry.coordinates.map((p) => ({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: p,
                },
                properties: {},
              })),
            };
            const pt = nearestPoint(coord, points);
            distance = pt.properties.distanceToPoint;
            nearestFeaturePoint = pt;
            break;
          }
          case 'MultiLineString': {
            const points: FeatureCollection<Point> = {
              type: 'FeatureCollection',
              features: feature.geometry.coordinates.map((lineString) =>
                nearestPointOnLine({ type: 'LineString', coordinates: lineString }, coord)
              ),
            };
            const pt = nearestPoint(coord, points);
            distance = pt.properties.distanceToPoint;
            nearestFeaturePoint = pt;
            break;
          }
          case 'Polygon': {
            const points = fnExplode(feature.geometry);
            const pt = nearestPoint(coord, points);
            distance = pt.properties.distanceToPoint;
            nearestFeaturePoint = pt;
            break;
          }
          default:
            distance = Infinity;
            break;
        }
        return {
          feature,
          nearest: nearestFeaturePoint ? nearestFeaturePoint.geometry.coordinates : [0, 0],
          distance,
        };
      }),
      ['distance']
    )
  );

  if (!result) return null;
  return result;
}
