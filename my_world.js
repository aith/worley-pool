"use strict";

/*
Implementation:
1-node-per-cube Worley Noise, but instead of changing the colors of pixels, the colors of tiles are used. Like in Worley's
paper, spacial subdivision is used for performance; the space is broken up into a grid, and each point needs
to only check if its closest to points within the surrounding 8+1 tiles.
 */

/*
Random notes
- wow, text() is such a good debugging feature
- change the frameRate for debugging too
- watch for variable name overlaps- caused me to waste 1-2 hours
 */

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
}

function p3_tileWidth() {
  return 16;
}
function p3_tileHeight() {
  return 8;
}

function supercellDiameter() {
  return 5;
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
function p3_drawTile(i, j) {
  let key = [i, j];
  noStroke();
  push(); // start new drawing state
  let home = roundToNearestSupercell(i, j);
  if(arrayEquals(key, home)) {
    if(!pointers[key]) {  // if home doesn't have a point
      let p = getPoint(i, j, supercellDiameter());
      let tile = [floor(p[0]),floor(p[1])];
      pointers[key] = tile;
      points[tile] = p;
    }
  }

  let p;
  if (!pointers[home]) {  // if the home hasn't generated yet, and thus hasn't assigned a point
    fill(0,0,0);
  }
  else {  // note this happens every frame
    let pp = pointers[home];
    p = points[pp];

    if (arrayEquals(key, pp) ) {  // moven point
      let clampx1 = home[0] - floor(supercellDiameter()/2),
          clampx2 = home[0] + floor(supercellDiameter()/2),
          clampy1 = home[1] - floor(supercellDiameter()/2),
          clampy2 = home[1] + floor(supercellDiameter()/2);
      let np = getMovedPoint(i, j, clampx1, clampx2, clampy1, clampy2, p[0], p[1]);
      let dx = (np[0] | 0) - (i | 0);
      let dy = (np[1] | 0) - (j | 0);
      if (dx != 0 || dy != 0) { // check if point moved onto new tile
        let nx = i + dx;
        let ny = j + dy;
        assignNewPointParent(i, j, nx, ny, pp[0], pp[1], np);
        p = points[[nx,ny]]
        pointers[home] = [nx, ny];
      } else {  // otherwise update val
        points[pp] = np;
      }
    }
    // get dists
    let neighbors = getNeighborSupercells(home[0], home[1]);
    let min = dist(i, j, p[0], p[1]);
    let cp = p;
    let b = 0;
    for(let idx = 0; idx < neighbors.length; idx++) {
      let p = points[pointers[neighbors[idx]]];
      if(!p) continue; // p's center hasn't rendered yet
      let d = dist(i, j, p[0], p[1]);
      if(d < min)
      {
        min = d;
        cp = neighbors[idx];
      }
    }
    let m = map(min, 0, sqrt(50), 10, 40)
    m *= m;  // sharper differences

    // noiseSeed(worldSeed + i + j);
    // let a = noise(i, j)
    // let d = noise(i, j)
    // let c = noise(i, j)
    // fill(m * a, m * a * a, m * a * a);

    fill(m, m/3, 0)  // lava
    let h = -(m / 50);
    quad(-tw, 0-h,
        0, th-h,
        tw, 0-h,
        0, -th-h);
  }
  // displayPoints(i, j, key, home)

  pop();
}

function assignNewPointParent(x1, y1, x2, y2, homex, homey, point) {
  delete points[[x1, y1]];
  points[[x2, y2]] = point;
}

function displayPoints(i, j, key, home) {
  if(arrayEquals(key, pointers[home])) {  // draw points
    let point = points[pointers[home]];
    fill(255,255,0 )
    ellipse(point[0] - i,point[1] - j,10,10)
  }
}

// this is where the eval points should be anchored to. This is the center of each box
// used for getting a tile's box center
function roundToNearestSupercell(x, y) {
  let d = supercellDiameter();
  let nx = round(x / d) * d;
  let ny = round(y / d) * d;
  return [nx, ny]
}

function getNeighborSupercells(i, j) {
  let o = supercellDiameter();
  return [
    [i-o, j],
    [i+o, j],
    [i, j-o],
    [i, j+o],
    [i-o, j-o],
    [i+o, j+o],
    [i+o, j-o],
    [i-o, j+o]
  ];
}

function getMovedPoint(i, j, clampx1, clampx2, clampy1, clampy2, pointx, pointy) {
  noiseSeed("move"+i+j)
  let dx = 1 * random(0, 1) - .5;  // do these return the same two values?
  let dy = 1 * random(0, 1) - .5;
  let nx = constrain(pointx + dx, clampx1, clampx2)  // TODO replace these with a smoother clamp
  let ny = constrain(pointy + dy, clampy1, clampy2)
  return [nx, ny];
}

function getPoint(i, j, offset) {
  // noiseSeed(getSeed(i,j));
  // let x = i - offset/2 + noise(i, 0) * offset;
  // let y = j - offset/2 + noise(0, j) * offset;
  let x = i - floor(offset/2) + random(0, 1) * (offset-1);
  let y = j - floor(offset/2) + random(0, 1) * (offset-1);
  return [x, y];
}

function genEvalPoint(i, j) {
  noiseSeed([i, j] + "eval");
  let x = i + noise(i, j);
  let y = j + noise(i, j);
  return [x, y];
}

function getSeed(i, j) {
  return XXH.h32("" + i + j);
}

function getPointCount(i, j, seed) {
  noiseSeed(seed);
  let max = 4;
  let count = constrain(noise(1,max+1), 1, max) | 0;  // how dould I have done poisson?
  return count;
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
