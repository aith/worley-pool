"use strict";

/* global XXH */
/* exported --
    p3_preload
    p3_setup
    p3_worldKeyChanged
    p3_tileWidth
    p3_tileHeight
    p3_tileClicked
    p3_drawBefore
    p3_drawTile
    p3_drawSelectedTile
    p3_drawAfter
*/

class Sprite {
  constructor(animation, option, speed) {
    this.animation = animation;
    this.option = option;
    this.speed = speed;
    this.index = 0;
    this.wO = 42;
    this.hO = 36;
    this.totalFrames = 3;
  }

  show() {
    let index = floor(this.index) % this.totalFrames;
    image(
      this.animation,
      0,
      0,
      40,
      40,
      index * this.wO,
      this.option * this.hO,
      this.wO,
      this.hO
    );
  }

  animate() {
    this.index += this.speed;
  }
}

function p3_preload() {
}

function p3_setup() {
}

let worldSeed;

function p3_worldKeyChanged(key) {
  worldSeed = XXH.h32(key, 0);
  noiseSeed(worldSeed);
  randomSeed(worldSeed);
}

function p3_tileWidth() {
  return 32;
}
function p3_tileHeight() {
  return 16;
}

let [tw, th] = [p3_tileWidth(), p3_tileHeight()];

let clicks = {};
let rippleSources = [];
let tileSprites = {};

function p3_tileClicked(i, j) {
  let key = [i, j];
  clicks[key] = 1 + (clicks[key] | 0); // increment clicks
  rippleSources.push([i, j, millis()]);
}

function p3_drawBefore() {}

// Q: do i need to store this much data?
let hasHome = {}, hasSeed = {}, hasCount = {}, hasPlotted = {}, foundClosest = {};
let seeds = {}, evals = {}, counts = {}, distances = {};
function p3_drawTile(i, j) {
  let key = [i, j];
  let feats;
  if (!hasHome[key]) {      evals[key] = genEvalPoint(i, j); hasHome[key] = true; }
  if (!hasSeed[key]) {      seeds[key] = getSeed(i, j); hasSeed[key] = true; }
  if (!hasCount[key]) {     counts[key] = getPointCount(i, j, seeds[key]); hasCount[key] = true; }
  if (!hasPlotted[key]) {   feats = genFeatPoints(i, j); hasPlotted[key] = true; }
  if (!foundClosest[key]) { findClosestPointInside(i, j, feats); foundClosest[key] = true; }  // 5 n 666666
  noStroke();
  if (XXH.h32("tile:" + [i, j], worldSeed) % 4 == 0) {
    fill(240, 200);
  } else {
    fill(255, 200);
  }
  push(); // start new drawing state
  // beginShape();
  // vertex(0, th - r(i, j));
  // vertex(tw, 0 - r(i, j));
  // vertex(0, -th - r(i, j));
  // endShape(CLOSE);
  // let a = random(4) | 0;
  let c = clicks[[i, j]] | 0;
  if (c % 2 == 1) {
    translate(-20, -90)
  }
  pop();
}

function getEvalPoint(i, j) {
  noiseSeed([i, j] + "x");
  let x = i + noise();
  noiseSeed([i, j] + "y");
  let y = j + noise();
  return [x, y];
}

function getSeed(i, j) {
  return XXH.h32("tile:" + [i, j]);
}

function getPointCount(i, j, seed) {
  noiseSeed(seed);
  let max = 4;
  let count = constrain(noise(1,max+1), 1, max) | 0;  // how dould I have done poisson?
  return count;
}
function genFeatPoints(i, j, count) {
  noiseSeed(seed);
  let feats = [];
  for(let p=0; p<count; p++) {
    feats.push([i + noise(), j + noise()]);
  }
  if (i == 0 && j == 1) print(feats);
  return feats;
}
function findClosestPointInside(i, j, points) {
  let ld=dist(i, j, points[0][0], points[0][1]);
  let cp=0;
  for(let p=1; p<points.length; p++) {
    let d = dist(i, j, points[p][0], points[p][1]);
    if (d < ld) {
      ld = d;
      cp = p;
    }
  }
  return points[cp];
}

function placeTile(ti, tj, hOff) {
  image(tilesetImage, -32, -16 + hOff, 64, 64, ti * 111, tj * 128, 111, 128); // take offset from lookup(code)
}

function p3_drawSelectedTile(i, j) {
  noFill();
  stroke(0, 255, 0, 128);

  beginShape();
  vertex(-tw, 0);
  vertex(0, th);
  vertex(tw, 0);
  vertex(0, -th);
  endShape(CLOSE);

  noStroke();
  fill(0);
  text("tile " + [i, j], 0, 0);
}

function p3_drawAfter() {}
