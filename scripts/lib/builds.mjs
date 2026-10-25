// @ts-check

/**
 * @typedef {{ title?: string, shot?: string, shotAlt?: string }} BuildWithShot
 */

/**
 * @param {BuildWithShot} item
 * @returns {BuildWithShot}
 */
export function validateBuildShot(item) {
  if (!item.shot) return item;
  if (typeof item.shotAlt !== "string" || item.shotAlt.trim() === "") {
    throw new Error(`Build "${item.title ?? item.shot}" has a shot but no shotAlt.`);
  }
  return item;
}
