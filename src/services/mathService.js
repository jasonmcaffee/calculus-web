import {Vector3} from 'three';


/// /http://manual.conitec.net/avec-intro.htm

/**
 * Converts degrees into radians, which are used to calculate vectors on the surface of a sphere.
 * @param degreeIncrement
 * @returns {Array}
 */
export function calculateRadiansFromDegrees({ degreeIncrement=45}={}){
  let radians = [];
  for(let d = 0; d < 360; d+=degreeIncrement){
    let radian = d * Math.PI / 180;
    radians.push(radian);
  }
  return radians;
}

/**
 * When performing a hit test for a sphere shaped bullet, we want to send rays from the center of the sphere to points
 * on the surface of the sphere.
 * Currently calculates points for 3 planes.
 * @param startPosition - x, y, z where lines should start from
 * @param radius - line length from startPosition
 * @param radians - number of lines per plane. this is precalculated on initialization in order to avoid unneeded calcs during frame rendering.
 */
export function calculateSphereSurfacePositions({startPosition={x:0, y:0, z:0}, radius=1, degreeIncrement=45, flatZ=false, flatY=false, flatX=false}={}){
  let radians = calculateRadiansFromDegrees({degreeIncrement});
  let {x, y, z} = startPosition;//starting point of each line we draw
  let x2, y2, z2;
  let spherePositions = [];
  //we want to create lines inside the bullet sphere, in such a way that they'll be useful for hit testing
  for(let i = 0, len=radians.length; i < len; ++i){
    let radian = radians[i];

    if(flatZ){
      //perfect back to front circle. flat z
      x2 = x - radius * Math.sin(radian);
      y2 = y - radius * Math.cos(radian);
      z2 = z;
      spherePositions.push({x:x2, y:y2, z:z2});
    }

    if(flatY){
      //perfect left to right circle. flat y
      x2 = x + radius * Math.sin(radian);
      y2 = y;
      z2 = z + radius * Math.cos(radian);
      spherePositions.push({x:x2, y:y2, z:z2});
    }

    if(flatX){
      //perfect left to right circle. flat x
      x2 = x;
      y2 = y - radius * Math.sin(radian);
      z2 = z - radius * Math.cos(radian);
      spherePositions.push({x:x2, y:y2, z:z2});
    }

  }
  return spherePositions;
}

/**
 * Useful for rotating an object towards a vector.
 * e.g. drone cloud rotating towards player would first find the degrees between center position and player position, then rotateVectorAroundYAxis.
 * @param vector1
 * @param vector2
 * @returns {number} - degrees between vector1 and vector2
 */
export function findAngleInDegreesBetweenVectors({vector1={x:0, y:0, z:0}, vector2={x:0, y:0, z:0}}){
  let vector1Length = calculateVectorLengthAKAMagnitude(vector1);
  let vector2Length = calculateVectorLengthAKAMagnitude(vector2);
  let dotProduct = calculateDotProduct({vector1, vector2});
  let cosTheta = dotProduct / (vector1Length * vector2Length);
  let angleInRadians = Math.acos(cosTheta);
  let angleInDegrees = convertRadiansToDegrees(angleInRadians);
  return angleInDegrees;
}

//https://www.cs.helsinki.fi/group/goa/mallinnus/3dtransf/3drot.html#Y-Axis Rotation
export function rotateVectorAroundYAxis({vector, degrees, axisVector={x:0, y:0, z:0}}){
  let transformedVector = subtractVectors({vector1: vector, vector2:axisVector});
  let radians = convertDegreesToRadians(degrees);
  let {x, y, z} = transformedVector;
  let rotationResultVector = {
    x: z * Math.sin(radians) + x * Math.cos(radians), //x' = z*sin q + x*cos q
    y,
    z: z * Math.cos(radians) - x * Math.sin(radians) //z' = z*cos q - x*sin q
  };
  let newPosition = addVectors({vector1: axisVector, vector2:rotationResultVector});
  return newPosition;
}

/**
 * https://jsfiddle.net/b3jb5uy5/2/
 * NOTE: something is a bit off in this chain of functions. z lowers the more times it is called.
 * Rotates a vector by N degrees around the axis vector.
 hypotenuse
           ◢ opposite
    adjacent
 Soh...     Sine = Opposite / Hypotenuse
 ...cah...  Cosine = Adjacent / Hypotenuse
 ...toa     Tangent = Opposite / Adjacent

 * https://www.youtube.com/watch?v=UaK2q22mMEg
 * @param vector
 * @param axisVector
 * @param degrees
 */
export function rotateVector({vector, axisVector, degrees}){
  let radians = convertDegreesToRadians(degrees);

  let normalizedAxisVector = normalizeVector(axisVector);//n hat
  ensureVectorPrecision({vector:normalizedAxisVector});

  //let normalizedAxisVector = new Vector3(axisVector.x, axisVector.y, axisVector.z).normalize();//  <-- doesnt fix issue

  //for a right triangle, what is the ratio of adjacent side to the hypotenuse side.
  let cosRadians = round( Math.cos(radians) );

  //for a right triangle, what is the ratio of opposite side to the hypotenuse side.
  let sinRadians = round( Math.sin(radians) );


  let vectorThatIsOrthogonalToNormalizedAxisVectorAndVector = calculateCrossProduct({vector1: normalizedAxisVector, vector2: vector});
  ensureVectorPrecision({vector:vectorThatIsOrthogonalToNormalizedAxisVectorAndVector});

  let vectorScaledByCosRadian = multiplyVectorByScalar({vector, scalar: cosRadians});
  ensureVectorPrecision({vector: vectorScaledByCosRadian});

  let orthagonalVectorScaledBySinRadians = multiplyVectorByScalar({vector: vectorThatIsOrthogonalToNormalizedAxisVectorAndVector, scalar: sinRadians});
  ensureVectorPrecision({vector: orthagonalVectorScaledBySinRadians});

  let vectorPrime = addVectors(({vector1: vectorScaledByCosRadian, vector2: orthagonalVectorScaledBySinRadians}));
  ensureVectorPrecision({vector:vectorPrime});
  return vectorPrime;
}

function ensureVectorPrecision({vector, precision=5}){
  vector.x = round(vector.x, precision);
  vector.y = round(vector.y, precision);
  vector.z = round(vector.z, precision);
}

//round(1234.5678, 1); // 1234.6
//round(1234.5678, -1); // 1230
function round(number, precision=5) {
  var factor = Math.pow(10, precision);
  var tempNumber = number * factor;
  var roundedTempNumber = Math.round(tempNumber);
  return roundedTempNumber / factor;
}

function addVectors({vector1, vector2}){
  let {x: x1, y: y1, z: z1} = vector1;
  let {x: x2, y: y2, z: z2} = vector2;
  return {
    x: x1 + x2,
    y: y1 + y2,
    z: z1 + z2,
  };
}

function subtractVectors({vector1, vector2}){
  let {x: x1, y: y1, z: z1} = vector1;
  let {x: x2, y: y2, z: z2} = vector2;
  return {
    x: x1 - x2,
    y: y1 - y2,
    z: z1 - z2,
  };
}

function multiplyVectorByScalar({vector, scalar}){
  let {x, y, z} = vector;
  return {
    x: x * scalar,
    y: y * scalar,
    z: z * scalar,
  };
}
/**
 * Given two linearly independent vectors a and b, the cross product, a × b, is a vector that is perpendicular to both a and b and thus normal to the plane containing them.
 *
 * https://www.khanacademy.org/math/linear-algebra/vectors-and-spaces/dot-cross-products/v/linear-algebra-cross-product-introduction
 * https://en.wikipedia.org/wiki/Cross_product
 * @param vector1
 * @param vector2
 */
function calculateCrossProduct({vector1, vector2}){
  let {x: a1, y: a2, z: a3} = vector1;
  let {x: b1, y: b2, z: b3} = vector2;

  let x = (a2 * b3) - (a3 * b2);
  let y = (a3 * b1) - (a1 * b3);
  let z = (a1 * b2) - (a2 * b1);

  return {x, y, z};  //
}

/**
 * In Euclidean geometry, the dot product of the Cartesian coordinates of two vectors is widely used and often called inner product (or rarely projection product)
 * Geometrically, it is the product of the Euclidean magnitudes of the two vectors and the cosine of the angle between them.
 * These definitions are equivalent when using Cartesian coordinates. In modern geometry, Euclidean spaces are often defined by using vector spaces.
 * In this case, the dot product is used for defining lengths (the length of a vector is the square root of the dot product of the vector by itself)
 * and angles (the cosine of the angle of two vectors is the quotient of their dot product by the product of their lengths).
 * @param vector1
 * @param vector2
 * @returns {number}
 */
function calculateDotProduct({vector1={x:0, y:0, z:0}, vector2={x:0, y:0, z:0}}){
  let {x:x1, y:y1, z:z1} = vector1;
  let {x:x2, y:y2, z:z2} = vector2;
  let dotProduct = x1 * x2 + y1 * y2 + z1 * z2;
  return dotProduct;
}

//finds the unit vector/vector normal. i.e. n hat
function normalizeVector({x, y, z, w}){
  let vectorLength = calculateVectorLengthAKAMagnitude({x, y, z});
  let unitVector = {
    x: x / vectorLength,
    y: y / vectorLength,
    z: z / vectorLength,
  };
  if(w != undefined){
    unitVector.w = w / vectorLength;
  }
  return unitVector;
}

/**
 * The magnitude, or length of a vector is denoted by two vertical stripes on either side of the vector: |V|.
 * It can be calculated with Pythagoras' theorem. For those of you that don't know or forgot it:
 * |V| = square-root ((Vx)2 + (Vy)2 + (Vz)2)
 * A vector with magnitude 1 is called a unit vector
 * @param x
 * @param y
 * @param z
 * @returns {number}
 */
function calculateVectorLengthAKAMagnitude({x, y, z}){
  let xPow2 = Math.pow(x, 2);
  let yPow2 = Math.pow(y, 2);
  let zPow2 = Math.pow(z, 2);
  let vectorLength = Math.sqrt(xPow2 + yPow2 + zPow2);
  return vectorLength;
}

const piDividedBy180 = Math.PI / 180;
function convertDegreesToRadians(degrees){
  let radian = degrees * piDividedBy180;//Math.PI / 180;
  return radian;
}

function convertRadiansToDegrees(radians){
  let degrees = radians/piDividedBy180;
  return degrees;
}