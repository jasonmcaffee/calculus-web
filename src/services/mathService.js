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
export function calculateSphereSurfacePositions({startPosition={x:0, y:0, z:0}, radius=1, degreeIncrement=45, flatZ=false, flatY=true, flatX=false}={}){
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