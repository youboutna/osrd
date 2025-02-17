import { isNil, isNaN, omit, values } from 'lodash';

/**
 * Simple function that take an input and try to convert it as a number.
 */
export function castToNumber(value: unknown): number | null | undefined {
  if (isNil(value)) return value;

  if (typeof value === 'boolean') return +value;
  if (value === '') return null;

  const stringValue = `${value}`;
  const castValue = +stringValue;

  return isNaN(castValue) || Math.abs(castValue) === Infinity ? null : castValue;
}

/**
 * Given a number, shorten it in string.
 * Example 1234 -> 1.2K
 */
export function shortNumber(value: unknown): string {
  let num = castToNumber(value);
  if (isNil(num)) return '';

  if (Math.abs(num) < 1000) {
    return `${num}`;
  }

  const sign = num < 0 ? '-' : '';
  const suffixes: Record<string, number> = {
    K: 6,
    M: 9,
    B: 12,
    T: 16,
  };

  num = Math.abs(num);
  const size = Math.floor(num).toString().length;

  const exponent = size % 3 === 0 ? size - 3 : size - (size % 3);
  let shortNumberValue = `${Math.round(10 * (num / 10 ** exponent)) / 10}`;

  // eslint-disable-next-line no-restricted-syntax
  for (const suffix in suffixes) {
    if (exponent < suffixes[suffix]) {
      shortNumberValue += suffix;
      break;
    }
  }

  return sign + shortNumberValue;
}

/**
 * Round a number to the upper (or lower) number.
 */
export function roundNumber(value: number, upper = false): number {
  const round = Math.round(value);
  if (upper) return round < value ? round + 1 : round;
  return round > value ? round - 1 : round;
}

/**
 * Check if the object value are all null or undefined or not.
 *
 * @param obj The object to check
 * @param fields2omit A list of field to omit to check
 * @returns True if all fields are nil, false otherwise
 */
export function isNilObject(
  obj: { [key: string]: unknown },
  fields2omit: Array<string> = []
): boolean {
  return values(omit(obj, fields2omit)).every((e) => isNil(e));
}

/**
 * Function that check if value is not nil
 * with the good typesctipt type (usefull in filters on array)
 */
export function notEmpty<T>(value: T | null | undefined): value is T {
  return !isNil(value);
}

/**
 * Given a point (the provided coordinates), this function changes the position of the provided html element
 * so it's always on the user screen.
 * This funciton is really usefull when you want to display a tooltip near the mouse pointer.
 *
 * @param coordinates Usually the coordinate of the mouse
 * @param element The html element to move (ie. the div of the tooltip)
 */
export function tooltipPosition(coordinates: [number, number], element: HTMLElement): void {
  // constant
  const offset = 10;
  const maxX = window.innerWidth;
  const maxY = window.innerHeight;
  const mouseX = coordinates[0];
  const mouseY = coordinates[1];
  const elementWidth = element.offsetWidth;
  const elementHeight = element.offsetHeight;

  // compute diagonals
  const diagTopLeft = mouseX ** 2 + mouseY ** 2;
  const diagTopRight = (maxX - mouseX) ** 2 + mouseY ** 2;
  const diagBottomleft = mouseX ** 2 + (maxY - mouseY) ** 2;
  const diagBottomRight = (maxX - mouseX) ** 2 + (maxY - mouseY) ** 2;

  if (diagTopLeft > diagTopRight && diagTopLeft > diagBottomleft && diagTopLeft > diagBottomRight) {
    // display in top / Left
    element.style.top = `${mouseY - elementHeight - offset}px`;
    element.style.left = `${mouseX - elementWidth - offset}px`;
  } else if (
    diagTopRight > diagTopLeft &&
    diagTopRight > diagBottomleft &&
    diagTopRight > diagBottomRight
  ) {
    // display in top / right
    element.style.top = `${mouseY - elementHeight - offset}px`;
    element.style.left = `${mouseX + offset}px`;
  } else if (
    diagBottomleft > diagTopLeft &&
    diagBottomleft > diagTopLeft &&
    diagBottomleft > diagBottomRight
  ) {
    // display in bottom / left
    element.style.top = `${mouseY + offset}px`;
    element.style.left = `${mouseX - elementWidth - offset}px`;
  } else {
    // display in bottom / right;
    element.style.top = `${mouseY + offset}px`;
    element.style.left = `${mouseX + offset}px`;
  }
}

/**
 * Just the event preventdefault.
 * Usefull for listeners.
 */
export function preventDefault(e: Event): void {
  e.preventDefault();
}
