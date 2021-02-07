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
  frameRate(5)
}

let worldSeed;
let evalGenThresh;  // how many times until a new eval point is generated.
let evalGenIndex = 0;

function p3_worldKeyChanged(key) {
  worldSeed = XXH.h32(key, 0);
  noiseSeed(worldSeed);
  randomSeed(worldSeed);
  reseedThresh();
}

function reseedThresh(i = 0, j = 0) {
  evalGenThresh = 5 + noise(i, j) * 15 | 0;
}

function p3_tileWidth() {
  return 16;
}
function p3_tileHeight() {
  return 8;
}

let [tw, th] = [p3_tileWidth(), p3_tileHeight()];
let [wr, hr] = [tw/2, th/2];

let clicks = {};
let tileSprites = {};

function p3_tileClicked(i, j) {
  let key = [i, j];
  clicks[key] = 1 + (clicks[key] | 0); // increment clicks
}

function p3_drawBefore() {}

let pointers = {}, points = {}; //
// Q: do i need to store this much data?
let hasHome = {}, hasSeed = {}, hasCount = {}, hasPlotted = {}, foundClosest = {};
let seen = {}, seeds = {}, evals = {}, counts = {}, distances = {};
function p3_drawTile(i, j) {
  let key = [i, j];
  let feats;
  // if (!seen[key]) {
  //   seen[key] = true;
  //   if (evalGenIndex > evalGenThresh) {
  //     evals[key] = genEvalPoint(i, j);
  //     reseedThresh(i, j);
  //     evalGenIndex = 0;
  //   }
  //   evalGenIndex++;
  // }
  // if (!seen[key]) {
  //   seen[key] = true;
  //   if (evalGenIndex > evalGenThresh) {
  //     evals[key] = genEvalPoint(i, j);
  //     reseedThresh(i, j);
  //     evalGenIndex = 0;
  //   }
  //   evalGenIndex++;
  // }
  // if (!hasHome[key]) {      evals[key] = genEvalPoint(i, j); hasHome[key] = true; }
  // if (!hasSeed[key]) {      seeds[key] = getSeed(i, j); hasSeed[key] = true; }
  // if (!hasCount[key]) {     counts[key] = getPointCount(i, j, seeds[key]); hasCount[key] = true; }
  // if (!hasPlotted[key]) {   feats = genFeatPoints(i, j); hasPlotted[key] = true; }
  // if (!foundClosest[key]) { findClosestPointInside(i, j, feats); foundClosest[key] = true; }  // 5 n 666666
  noStroke();
  // if (XXH.h32("tile:" + [i, j], worldSeed) % 4 == 0) {
  //   fill(240, 200);
  // } else {
  //   fill(255, 200);
  // }
  push(); // start new drawing state
  // beginShape();
  // if(evals[key]) {
  //   ellipse(0,0, 10, 10);
  // }
  // vertex(0, th);
  // vertex(tw, 0 );
  // vertex(0, -th);
  // vertex(-tw, 0);

  // print(dist(i+wr, j+hr, roundToNearestSupercell(i, j)))
  let home = roundToNearestSupercell(i, j);
  if(arrayEquals(key, home)) {
    if(!pointer[key]) {
      let p = getPoint(i, j);
      let pt = [floor(p[0]),floor(p[1])];
      pointer[key] = pt;
      point[pt] = p;
    }
  }

  let n = dist(i, j, home[0], home[1]);
  fill(n*n * 60, 0, 0)
  endShape(CLOSE);
  let c = clicks[[i, j]] | 0;
  if (c % 2 == 1) {
    translate(-20, -90)
  }
    fill(0)
    ellipse(0,0,20,20)
  }
  pop();
}

// this is where the eval points should be anchored to. This is the center of each box
// used for getting a tile's box center
let boxDiameter = 5;
function roundToNearestSupercell(x, y) {
  let d = 5;
  let nx = round(x / d) * d;
  let ny = round(y / d) * d;
  return [nx, ny]
}

function attachPointer(x, y, a, b) {
  //first remove from points, if anchor points to one
  let old = pointers[[x,y]];
  delete points[old];
  let _new = [a, b]
  pointers[[x,y]] = _new;
}

function getPoint(i, j) {
  noiseSeed("choosing point for"+[i,j]);
  let x = noise(i, 0);
  let y = noise(0, j);
  return [x, y];
}

function genEvalPoint(i, j) {
  noiseSeed([i, j] + "eval");
  let x = i + noise(i, j);
  let y = j + noise(i, j);
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
  let feats = [];
  for(let p=0; p<count; p++) {
    feats.push([i + noise(0, 1), j + noise(0, 1)]);
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
  image(tilesetImage, -tw, -th + hOff, 64, 64, ti * 111, tj * 128, 111, 128); // take offset from lookup(code)
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


function arrayEquals(a, b) {
  return Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((val, index) => val === b[index]);
}