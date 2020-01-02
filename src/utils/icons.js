/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/* This file needs to be plain JS to be imported by scripts/build-release.js */
/* eslint-disable import/no-commonjs */

const AVAILABLE_SIZES = [8, 10, 12, 16, 18, 20, 24, 32];
const DENSITIES = [1, 1.5, 2, 3, 4];
const fs = require('fs');
const path = require('path');
const {remote} = require('electron');

const iconsPath = fs.existsSync(path.resolve(process.cwd(), 'icons.json'))
  ? path.resolve(process.cwd(), 'icons.json') // development
  : path.resolve(process.cwd(), 'static', 'icons.json'); // build
const ICONS = JSON.parse(fs.readFileSync(iconsPath, {encoding: 'utf8'}));

// Takes a string like 'star', or 'star-outline', and converts it to
// {trimmedName: 'star', variant: 'filled'} or {trimmedName: 'star', variant: 'outline'}
function getIconPartsFromName(icon) {
  const isOutlineVersion = icon.endsWith('-outline');
  const trimmedName = isOutlineVersion ? icon.replace('-outline', '') : icon;
  const variant = isOutlineVersion ? 'outline' : 'filled';
  return {trimmedName: trimmedName, variant: variant};
}

function getIconFileName(icon, size, density) {
  return `${icon.trimmedName}-${icon.variant}-${size}@${density}x.png`;
}

// $FlowFixMe not using flow in this file
function buildLocalIconPath(name, size, density) {
  const icon = getIconPartsFromName(name);
  return path.join('icons', getIconFileName(icon, size, density));
}

function buildLocalIconURL(name, size, density) {
  const icon = getIconPartsFromName(name);
  return `icons/${getIconFileName(icon, size, density)}`;
}

// $FlowFixMe not using flow in this file
function buildIconURL(name, size, density) {
  const icon = getIconPartsFromName(name);
  // eslint-disable-next-line prettier/prettier
  const url = `https://external.xx.fbcdn.net/assets/?name=${
    icon.trimmedName
  }&variant=${
    icon.variant
  }&size=${size}&set=facebook_icons&density=${density}x`;
  if (
    typeof window !== 'undefined' &&
    (!ICONS[name] || !ICONS[name].includes(size))
  ) {
    // From utils/isProduction
    const isProduction = !/node_modules[\\/]electron[\\/]/.test(
      // $FlowFixMe
      process.execPath || remote.process.execPath,
    );

    if (!isProduction) {
      const existing = ICONS[name] || (ICONS[name] = []);
      if (!existing.includes(size)) {
        existing.push(size);
        existing.sort();
        fs.writeFileSync(iconsPath, JSON.stringify(ICONS, null, 2), 'utf8');
        console.warn(
          `Added uncached icon "${name}: [${size}]" to /static/icons.json. Restart Flipper to apply the change.`,
        );
      }
    } else {
      console.warn(
        `Using uncached icon: "${name}: [${size}]". Add it to /static/icons.json to preload it.`,
      );
    }
  }
  return url;
}

module.exports = {
  ICONS: ICONS,

  buildLocalIconPath: buildLocalIconPath,
  buildIconURL: buildIconURL,

  // $FlowFixMe: not using flow in this file
  getIconURL(name, size, density) {
    if (name.indexOf('/') > -1) {
      return name;
    }

    let requestedSize = size;
    if (!AVAILABLE_SIZES.includes(size)) {
      // find the next largest size
      const possibleSize = AVAILABLE_SIZES.find(size => {
        return size > requestedSize;
      });

      // set to largest size if the real size is larger than what we have
      if (possibleSize == null) {
        requestedSize = Math.max(...AVAILABLE_SIZES);
      } else {
        requestedSize = possibleSize;
      }
    }

    if (!DENSITIES.includes(density)) {
      // find the next largest size
      const possibleDensity = DENSITIES.find(scale => {
        return scale > density;
      });

      // set to largest size if the real size is larger than what we have
      if (possibleDensity == null) {
        density = Math.max(...DENSITIES);
      } else {
        density = possibleDensity;
      }
    }

    // resolve icon locally if possible
    if (
      remote &&
      fs.existsSync(
        path.join(
          remote.app.getAppPath(),
          buildLocalIconPath(name, size, density),
        ),
      )
    ) {
      return buildLocalIconURL(name, size, density);
    }
    return buildIconURL(name, requestedSize, density);
  },
};
