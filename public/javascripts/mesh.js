import { gl } from './context.js';
import { Material } from './material.js';
import { Texture2D } from './texture.js';
import { Program } from './shader.js';
import { util } from './htmlUtil.js';
import * as mat4 from './gl-matrix/mat4.js';
import * as mat3 from './gl-matrix/mat3.js';
import * as mat2 from './gl-matrix/mat2.js';
import * as vec3 from './gl-matrix/vec3.js';
import * as vec2 from './gl-matrix/vec2.js';
import * as vec4 from './gl-matrix/vec4.js';
import * as quat from './gl-matrix/quat.js';

class VertexData {
  index = -1;
  nativeNormal = [0.0, 0.0, 0.0];
  smoothedNormal = [0.0, 0.0, 0.0];
  weightedNormal = [0.0, 0.0, 0.0];
  nativeTangent = [0.0, 0.0, 0.0];
  biTangent = [0.0, 0.0, 0.0];
  fundTensor = [0.0, 0.0, 0.0];
  totalTensorWeight = 0.0;
  maxCurvature = 0.0;
  minCurvature = 0.0;
  maxCurvatureDir = [0.0, 0.0, 0.0];
  minCurvatureDir = [0.0, 0.0, 0.0];
  neighbours = new Set();
  ownerCluster;
  ownerPositionData;

  constructor(_index, _normal, _tangent) {
    this.index = _index;
    this.nativeNormal = _normal;
    this.nativeTangent = _tangent;
    vec3.cross(this.biTangent, this.nativeNormal, this.nativeTangent);
  }

  getPositionVector() {
    return this.ownerPositionData.position;
  }
}

class FaceData {
  vertex1;
  vertex2;
  vertex3;
  constructor(v1, v2, v3) {
    this.vertex1 = v1;
    this.vertex2 = v2;
    this.vertex3 = v3;
  }

  calculateWeightedNormal() {
    this.calculateWeightedNormalHelper(this.vertex1, this.vertex2, this.vertex3);
    this.calculateWeightedNormalHelper(this.vertex2, this.vertex3, this.vertex1);
    this.calculateWeightedNormalHelper(this.vertex3, this.vertex1, this.vertex2);
  }

  calculateWeightedNormalHelper(v1, v2, v3) {
    // weighted normal = v1 x v2 / |v1|^2 / |v2|^2
    // Paper reference: Weights for Computing Vertex Normals from Facet Normals - Nelson Max
    let pos1 = v1.getPositionVector();
    let pos2 = v2.getPositionVector();
    let pos3 = v3.getPositionVector();

    let e1 = vec3.sub([], pos2, pos1);
    let e2 = vec3.sub([], pos3, pos1);
    let weightedNormal = vec3.scale([], vec3.cross([], e1, e2), 1.0 / vec3.sqrLen(e1) / vec3.sqrLen(e2));

    // gltf or other mesh format usually output the same vertex as different individual ones (with different 
    // index) in the vertex array, because their normals can vary, however if a vertex's normal doesn't
    // change across multiple triangles, only 1 vertex per normal is outputed. To consider this situation,
    // when doing weighted normals, we have to accumulate weighted normals from all triangles this
    // vertex is in.
    vec3.add(v1.weightedNormal, v1.weightedNormal, weightedNormal);
  }

  computeWeingartenMatrix() {
    // Paper reference: Estimating Curvatures and Their Derivatives on Triangle Meshes - Szymon Rusinkiewicz, Princeton University
    // this algorithm computes 3 normal derivatives along three edges of the triangle, and solve them by least squares method to
    // estimate the face curvature

    // position of each vertices
    let pos1 = this.vertex1.getPositionVector();
    let pos2 = this.vertex2.getPositionVector();
    let pos3 = this.vertex3.getPositionVector();

    // normal vectors of each vertices
    let n1 = this.vertex1.smoothedNormal;
    let n2 = this.vertex2.smoothedNormal;
    let n3 = this.vertex3.smoothedNormal;

    // edge vectors of the triangle
    let e1 = vec3.sub([], pos2, pos1);
    let e2 = vec3.sub([], pos3, pos2);
    let e3 = vec3.sub([], pos1, pos3);

    // u and v are sets of coordinates we choose on the tangent plane of the triangle face, I use e1 as u and compute v
    let u = vec3.fromValues(e1[0], e1[1], e1[2]);
    let faceNormal = vec3.cross([], e1, e2);
    let v = vec3.cross([], faceNormal, e1);
    vec3.normalize(u, u);
    vec3.normalize(v, v);
    vec3.normalize(faceNormal, faceNormal);

    // transfer edge vectors to the tangent space, i.e. u and v and face normal
    // Note since all the edges are on the tangent plane, so the third component should always be 0
    let fromWorldToFaceTangent = mat3.fromValues(
      u[0], v[0], faceNormal[0],
      u[1], v[1], faceNormal[1],
      u[2], v[2], faceNormal[2]
    );

    vec3.transformMat3(e1, e1, fromWorldToFaceTangent)
    vec3.transformMat3(e2, e2, fromWorldToFaceTangent)
    vec3.transformMat3(e3, e3, fromWorldToFaceTangent)

    // calculate normal delta, the number suffix must match the edge
    let dn1 = vec3.sub([], n2, n1);
    let dn2 = vec3.sub([], n3, n2);
    let dn3 = vec3.sub([], n1, n3);

    // transfer normal delta to the face tangent plane like edge vectors
    // Note for tangent plane, we don't care about the third component of delta normal
    vec3.transformMat3(dn1, dn1, fromWorldToFaceTangent)
    vec3.transformMat3(dn2, dn2, fromWorldToFaceTangent)
    vec3.transformMat3(dn3, dn3, fromWorldToFaceTangent)

    /*************************************************************************************************************
     * Compute Weingarten matrix
     * 
     * Weingarten matrix or the second fundamental tensor
     * | e f |
     * | f g |
     * 
     * (Weingarten matrix) * (direction on the tangent plane) = (normal derivative along that direction)
     * 
     * By substituting the three edges we have 3 equations
     * W * e1 = dn1
     * W * e2 = dn2
     * W * e3 = dn3
     * 
     * expand them to have:
     * e * e1.x + f * e1.y = dn1.x
     * f * e1.x + g * e1.y = dn1.y
     * e * e2.x + f * e2.y = dn2.x
     * f * e2.x + g * e2.y = dn2.y
     * e * e3.x + f * e3.y = dn3.x
     * f * e3.x + g * e3.y = dn3.y
     * 
     * rewrite these linear equations in matrix form gives us:
     * | e1.x e1.y 0.00 |   
     * | 0.00 e1.x e1.y |
     * | e2.x e2.y 0.00 | * (e,f,g) = (dn1.x, dn1.y, dn2.x, dn2.y, dn3.x, dn3.y)
     * | 0.00 e2.x e2.y |
     * | e3.x e3.y 0.00 |
     * | 0.00 e3.x e3.y |
     * 
     * use least squares method to solve e,f,g
     *                                      
     *                                     | e1.x e1.y 0.00 |                                             |dn1.x|
     * | e1.x 0.00 e2.x 0.00 e3.x 0.00 |   | 0.00 e1.x e1.y |   |e|   | e1.x 0.00 e2.x 0.00 e3.x 0.00 |   |dn1.y|
     * | e1.y e1.x e2.y e2.x e3.y e3.x | * | e2.x e2.y 0.00 | * |f| = | e1.y e1.x e2.y e2.x e3.y e3.x | * |dn2.x|
     * | 0.00 e1.y 0.00 e2.y 0.00 e3.y |   | 0.00 e2.x e2.y |   |g|   | 0.00 e1.y 0.00 e2.y 0.00 e3.y |   |dn2.y|
     *                                     | e3.x e3.y 0.00 |                                             |dn3.x|
     *                                     | 0.00 e3.x e3.y |                                             |dn3.y|
     * 
     * => This is a standard linear equation format, Ax = b, x can be solved by multiplying both sides by A-inverse
     *************************************************************************************************************/
    let someCommonValue = e1[0] * e1[1] + e2[0] * e2[1] + e3[0] * e3[1];
    let mat = mat3.fromValues(
      e1[0] * e1[0] + e2[0] * e2[0] + e3[0] * e3[0],
      someCommonValue,
      0.0,
      someCommonValue,
      e1[1] * e1[1] + e1[0] * e1[0] + e2[1] * e2[1] + e2[0] * e2[0] + e3[1] * e3[1] + e3[0] * e3[0],
      someCommonValue,
      0.0,
      someCommonValue,
      e1[1] * e1[1] + e2[1] * e2[1] + e3[1] * e3[1]
    )

    let b = vec3.fromValues(
      e1[0] * dn1[0] + e2[0] * dn2[0] + e3[0] * dn3[0],
      e1[1] * dn1[0] + e1[0] * dn1[1] + e2[1] * dn2[0] + e2[0] * dn2[1] + e3[1] * dn3[0] + e3[0] * dn3[1],
      e1[1] * dn1[1] + e2[1] * dn2[1] + e3[1] * dn3[1]
    )

    let matInverse = mat3.invert([], mat);
    let efg/*Weingarten Matrix*/ = vec3.transformMat3([], b, matInverse);

    let tan1 = this.vertex1.ownerCluster.smoothedTangent;
    let tan2 = this.vertex2.ownerCluster.smoothedTangent;
    let tan3 = this.vertex3.ownerCluster.smoothedTangent;
    let biTan1 = this.vertex1.ownerCluster.smoothedBiTangent;
    let biTan2 = this.vertex2.ownerCluster.smoothedBiTangent;
    let biTan3 = this.vertex3.ownerCluster.smoothedBiTangent;

    // Since our face tangent space where we work out the curvature is different from the native orthonormal space of each vertex,
    // we need to 'project' the Weingarten matrix to each vertex, 'Project' might not be a correct term here, the aim here is to 
    // transfer the Weingarten matrix from our face tangent space to vertex tangent space
    let efg1 = this.transformWeingartenMatrixToVertexSpace(efg, tan1, biTan1, n1, faceNormal, fromWorldToFaceTangent);
    let efg2 = this.transformWeingartenMatrixToVertexSpace(efg, tan2, biTan2, n2, faceNormal, fromWorldToFaceTangent);
    let efg3 = this.transformWeingartenMatrixToVertexSpace(efg, tan3, biTan3, n3, faceNormal, fromWorldToFaceTangent);

    // This calculation gives Weingarten matrix for this vertex per face, we need to weight this result by this vertex's Voronoi area
    let p1 = vec3.transformMat3([], pos1, fromWorldToFaceTangent);
    let p2 = vec3.transformMat3([], pos2, fromWorldToFaceTangent);
    let p3 = vec3.transformMat3([], pos3, fromWorldToFaceTangent);
    let voronoiAreas = this.computeVoronoiArea([p1[0], p1[1]], [p2[0], p2[1]], [p3[0], p3[1]]);

    // Save the weighted Weingarten matrix
    vec3.add(this.vertex1.fundTensor, this.vertex1.fundTensor, vec3.scale([], efg1, voronoiAreas[0]));
    vec3.add(this.vertex2.fundTensor, this.vertex2.fundTensor, vec3.scale([], efg2, voronoiAreas[0]));
    vec3.add(this.vertex3.fundTensor, this.vertex3.fundTensor, vec3.scale([], efg3, voronoiAreas[0]));

    // Update the total weight
    this.vertex1.totalTensorWeight += voronoiAreas[0];
    this.vertex2.totalTensorWeight += voronoiAreas[1];
    this.vertex3.totalTensorWeight += voronoiAreas[2];
  }

  transformWeingartenMatrixToVertexSpace(efg, tangent, biTangent, vertNormal, faceNormal, worldToFace) {
    // We don't want the tangent data of this vertex to be modified so we make a copy
    let vertU = vec3.fromValues(tangent[0], tangent[1], tangent[2]);
    let vertV = vec3.fromValues(biTangent[0], biTangent[1], biTangent[2]);

    // first, rotate vertex coordinates system so it's coplanar to vertex tangent space
    let rotationAngle = vec3.angle(vertNormal, faceNormal);

    if (rotationAngle > 0.0001) {
      // if the angle is small enough, we skip the rotation
      let rotationAxis = vec3.cross([], vertNormal, faceNormal);
      let rotationMatrix = mat4.fromRotation([], rotationAngle, rotationAxis);
      vec3.transformMat4(vertU, vertU, rotationMatrix);
      vec3.transformMat4(vertV, vertV, rotationMatrix);
    }

    // now transfer vertex UV into face tangent space
    vec3.transformMat3(vertU, vertU, worldToFace);
    vec3.transformMat3(vertV, vertV, worldToFace);

    /* Use equation (Here U,V means vert UV in face tangent space):
     * new e = U-transpose * W * U
     * new f = U-transpose * W * V
     * new g = V-transpose * W * V
     * 
     *                   |e f|   |Ux|             |Ux * e + Uy * f| 
     * new e = |Ux Uy| * |f g| * |Uy| = |Ux Uy| * |Ux * f + Uy * g| = Ux * (Ux * e + Uy * f) + Uy * (Ux * f + Uy * g)
     * new e = Ux * Ux * e + Ux * Uy * f + Uy * Ux * f + Uy * Uy * g
     * new e = eUx^2 + gUy^2 + 2fUxUy
     * 
     *                   |e f|   |Vx|             |Vx * e + Vy * f|
     * new f = |Ux Uy| * |f g| * |Vy| = |Ux Uy| * |Vx * f + Vy * g| = Ux * (Vx * e + Vy * f) + Uy * (Vx * f + Vy * g)
     * new f = Ux * Vx * e + Ux * Vy * f + Uy * Vx * f + Uy * Vy * g
     * new f = eUxVx + f(UxVy + UyVx) + gUyVy
     * 
     *                   |e f|   |Vx|             |Vx * e + Vy * f|
     * new g = |Vx Vy| * |f g| * |Vy| = |Vx Vy| * |Vx * f + Vy * g| = Vx * (Vx * e + Vy * f) + Vy * (Vx * f + Vy * g)
     * new g = Vx * Vx * e + Vx * Vy * f + Vy * Vx * f + Vy * Vy * g
     * new g = eVx^2 + gVy^2 + 2fVxVy
     */
    return [
      efg[0] * vertU[0] * vertU[0] + efg[2] * vertU[1] * vertU[1] + 2.0 * efg[1] * vertU[0] * vertU[1],
      efg[0] * vertU[0] * vertV[0] + efg[1] * (vertU[0] * vertV[1] + vertU[1] * vertV[0]) + efg[2] * vertU[1] * vertV[1],
      efg[0] * vertV[0] * vertV[0] + efg[2] * vertV[1] * vertV[1] + 2.0 * efg[1] * vertV[0] * vertV[1]
    ];

  }

  computeVoronoiArea(p1, p2, p3) {
    // this entire calculation is done in face tangent space

    // middle points of 3 edges
    let m12 = vec2.scale([], vec2.add([], p1, p2), 0.5);
    let m23 = vec2.scale([], vec2.add([], p2, p3), 0.5);
    let m13 = vec2.scale([], vec2.add([], p1, p3), 0.5);

    // 3 edge vectors
    let e12 = vec2.sub([], p2, p1);
    let e23 = vec2.sub([], p3, p2);
    let e13 = vec2.sub([], p3, p1);

    //vec3.normalize(faceNormal, faceNormal);

    /* Calculate Orthocentre O
     * (O-m12) dot e12 = 0
     * (O-m23) dot e23 = 0
     * (O.x-m12.x) * e12.x + (O.y-m12.y) * e12.y = 0
     * (O.x-m23.x) * e23.x + (O.y-m23.y) * e23.y = 0
     * 
     * e12.x * x + e12.y * y = m12.x * e12.x + m12.y * e12.y
     * e23.x * x + e23.y * y = m23.x * e23.x + m23.y * e23.y
     * |e12.x e12.y| |x|   |m12.x * e12.x + m12.y * e12.y|
     * |e23.x e23.y| |y| = |m23.x * e23.x + m23.y * e23.y|
     */
    let m = mat2.fromValues(
      e12[0], e23[0],
      e12[1], e23[1]
    );
    let v = vec2.fromValues(m12[0] * e12[0] + m12[1] * e12[1], m23[0] * e23[0] + m23[1] * e23[1]);
    let orthoCentre = vec2.transformMat2([], v, mat2.invert([], m));

    // calculation varies between acute and obtuse triangles
    let angle1 = vec2.angle(e12, e13);
    let angle2 = vec2.angle(e23, vec2.scale([], e12, -1.0));
    let angle3 = vec2.angle(vec2.scale([], e13, -1.0), vec2.scale([], e23, -1.0));

    if (angle1 < Math.PI / 2.0 && angle2 < Math.PI / 2.0 && angle3 < Math.PI / 2.0) {
      // for acute triangles
      let area = (p, m1, m2) => {
        let po = vec2.sub([], orthoCentre, p);
        let p_m1 = vec2.sub([], m1, p);
        let p_m2 = vec2.sub([], m2, p);
        return 0.5 * vec3.len(vec2.cross([], po, p_m1)) + 0.5 * vec3.len(vec2.cross([], po, p_m2));
      }

      return [area(p1, m12, m13), area(p2, m12, m23), area(p3, m13, m23)];
    } else {
      // for obtuse triangles
      let pAcute1, pAcute2, pObtuse, mObtuse1, mObtuse2, mAcute, areaAcute1, areaAcute2;
      let vertIndex = [];
      if (angle1 >= Math.PI / 2.0) {
        pAcute1 = p2;
        pAcute2 = p3;
        pObtuse = p1;
        mObtuse1 = m12;
        mObtuse2 = m13;
        mAcute = m23;
        vertIndex = [1, 2, 0];
      } else if (angle2 >= Math.PI / 2.0) {
        pAcute1 = p1;
        pAcute2 = p3;
        pObtuse = p2;
        mObtuse1 = m12;
        mObtuse2 = m23;
        mAcute = m13;
        vertIndex = [0, 2, 1];
      } else if (angle3 >= Math.PI / 2.0) {
        pAcute1 = p1;
        pAcute2 = p2;
        pObtuse = p3;
        mObtuse1 = m13;
        mObtuse2 = m23;
        mAcute = m12;
        vertIndex = [0, 1, 2];
      }

      let eO1 = vec2.sub([], orthoCentre, mObtuse1);
      let eO2 = vec2.sub([], orthoCentre, mObtuse2);
      let eAcute = vec2.sub([], pAcute1, pAcute2);

      /* O + eO1 * t1 = pAcute1 + eAcute * t2
       * eO1.x * t1 - eAcute.x * t2 = pAcute1.x - O.x
       * eO1.y * t1 - eAcute.y * t2 = pAcute1.y - O.y
       * |eO1.x eAcute.x|   |t1|   
       * |eO1.y eAcute.y| * |t2| = (pAcute1 - O).xy
       */

      let m, v;
      m = mat2.fromValues(
        eO1[0], eO1[1],
        eAcute[0], eAcute[1]
      );
      v = vec2.sub([], pAcute1, orthoCentre);
      vec2.transformMat2(v, v, mat2.invert([], m));
      let p1m = vec2.add([], orthoCentre, vec2.scale([], eO1, v[0]));

      m = mat2.fromValues(
        eO2[0], eO2[1],
        eAcute[0], eAcute[1]
      );
      v = vec2.sub([], pAcute2, orthoCentre);
      vec2.transformMat2(v, v, mat2.invert([], m));
      let p2m = vec2.add([], orthoCentre, vec2.scale([], eO2, v[0]));

      let areas = [0.0, 0.0, 0.0];
      areas[vertIndex[0]] = 0.5 * vec3.len(vec2.cross([], vec2.sub([], p1m, pAcute1), vec2.sub([], mObtuse1, pAcute1)));
      areas[vertIndex[1]] = 0.5 * vec3.len(vec2.cross([], vec2.sub([], p2m, pAcute2), vec2.sub([], mObtuse2, pAcute2)));
      areas[vertIndex[2]] = 0.5 * vec3.len(vec2.cross([], vec2.sub([], pObtuse, pAcute1), vec2.sub([], pAcute2, pAcute1))) - areas[vertIndex[0]] - areas[vertIndex[1]];

      return areas;
    }
  }
}

class IndexHashTable {
  table = new Map();
  constructor() { }

  addVertex(inVertex) {
    this.table.set(inVertex.index, inVertex);
  }

  getVertex(index) {
    return this.table.get(index);
  }
}

class VertexCluster {
  vertices = new Set();
  neighbours = new Set();
  smoothedNormal = [0.0, 0.0, 0.0];
  smoothedTangent = [0.0, 0.0, 0.0];
  smoothedBiTangent = [0.0, 0.0, 0.0];
  clusterTensor = [0.0, 0.0, 0.0];
  maxCurvatureDir = [0.0, 0.0, 0.0];
  minCurvatureDir = [0.0, 0.0, 0.0];
  maxNeighbourAngle = 0.0;
  hasValidCurvature = false;
  hasUnifiedDirection = false;
  ownerPositionData;
  constructor() { }

  addVertex(vertex) {
    this.vertices.add(vertex);
    vertex.ownerCluster = this;
  }

  updateClusterNeighbour() {
    this.vertices.forEach(vertex => {
      vertex.neighbours.forEach(neighbourVertex => this.neighbours.add(neighbourVertex.ownerCluster));
    })
  }

  computeSmoothNormal() {
    // We also compute a so called smoothed tangent, this is just an intermediate value used to transform principal curvature direction
    // and will not be used in any other computation for now.
    // By my assumption, the smoothness of this tangent is not important, so we simply average them
    this.smoothedNormal = [0.0, 0.0, 0.0];
    this.smoothedTangent = [0.0, 0.0, 0.0];
    this.vertices.forEach(element => {
      vec3.add(this.smoothedNormal, this.smoothedNormal, element.weightedNormal);
      vec3.add(this.smoothedTangent, this.smoothedTangent, element.nativeTangent);
    });

    // Compute new tangent using the smoothed normal and combined tangent
    vec3.cross(this.smoothedBiTangent, this.smoothedNormal, this.smoothedTangent);
    vec3.cross(this.smoothedTangent, this.smoothedBiTangent, this.smoothedNormal);

    vec3.normalize(this.smoothedNormal, this.smoothedNormal);
    vec3.normalize(this.smoothedTangent, this.smoothedTangent);
    vec3.normalize(this.smoothedBiTangent, this.smoothedBiTangent);

    this.vertices.forEach(element => {
      element.smoothedNormal = this.smoothedNormal;
    });
  }

  computeFundTensor() {
    // Calculate weighted tensor
    this.clusterTensor = [0.0, 0.0, 0.0];
    let accumulatedWeight = 0.0;

    this.vertices.forEach(element => {
      vec3.add(this.clusterTensor, this.clusterTensor, element.fundTensor);
      accumulatedWeight += element.totalTensorWeight;
    });

    vec3.scale(this.clusterTensor, this.clusterTensor, 1.0 / accumulatedWeight);

    // at this point, we can already compute max/min curvature magnitude, we go ahead and store them in vertex, but we have to hold on for directions
    // since we are gonna smooth curvature directions later and will lose original fundamental tensor.
    let principal1 = [0.0, 0.0, 0.0];
    let principal2 = [0.0, 0.0, 0.0];

    this.computeEigenVector(this.clusterTensor, principal1, principal2);
    this.vertices.forEach(vertex => {
      vertex.maxCurvature = principal1[2];
      vertex.minCurvature = principal2[2];
    });
  }

  tryComputePrincipalCurvatures() {
    if (this.hasValidCurvature) return;

    // First we compute eigen vector (principal direction) with our current fundamental tensor
    let principal1 = [0.0, 0.0, 0.0];
    let principal2 = [0.0, 0.0, 0.0];
    this.computeEigenVector(this.clusterTensor, principal1, principal2);

    // Calculate the max&min curvature, if they are close enough, it means we are on a perfect sphere, curvatures are the same on every direction
    // We don't like uncertainty so I'm gonna skip this one and deal with it later after it's smoothed by surrounding fundamental tensors
    let maxCurvature = principal1[2];
    let minCurvature = principal2[2];
    if (maxCurvature - minCurvature > 0.0001) {
      // Save the weighted tensor
      this.hasValidCurvature = true;

      // calculate principal curvature directions
      this.maxCurvatureDir = [principal1[0], principal1[1], 0.0];
      this.minCurvatureDir = [principal2[0], principal2[1], 0.0];

      // project principle curvature direction from cluster space to object space, so we won't burden GPU for calculation
      let m = mat3.fromValues(
        this.smoothedTangent[0], this.smoothedBiTangent[0], this.smoothedNormal[0],
        this.smoothedTangent[1], this.smoothedBiTangent[1], this.smoothedNormal[1],
        this.smoothedTangent[2], this.smoothedBiTangent[2], this.smoothedNormal[2]
      )

      mat3.invert(m, m);

      vec3.transformMat3(this.maxCurvatureDir, this.maxCurvatureDir, m);
      vec3.transformMat3(this.minCurvatureDir, this.minCurvatureDir, m);

      vec3.normalize(this.maxCurvatureDir, this.maxCurvatureDir);
      vec3.normalize(this.minCurvatureDir, this.minCurvatureDir);
    }
  }

  updateMaxNeighbourAngle() {
    this.maxNeighbourAngle = 0.0;
    this.neighbours.forEach(elem1 => {
      if (elem1.hasValidCurvature) {
        this.neighbours.forEach(elem2 => {
          if (elem2.hasValidCurvature && elem1 !== elem2) {
            let v1 = this.ownerPositionData.position;
            let v2 = elem1.ownerPositionData.position;
            let v3 = elem2.ownerPositionData.position;
            let e1 = vec3.sub([], v2, v1);
            let e2 = vec3.sub([], v3, v1);
            let angle = vec3.angle(e1, e2);
            this.maxNeighbourAngle = angle > this.maxNeighbourAngle ? angle : this.maxNeighbourAngle;
          }
        });
      }
    });
  }

  smoothFundTensor() {
    if (this.maxNeighbourAngle === 0.0) {
      // no valid neighbour, we have to come up with an arbitrary principal direction
      // this will only affect principal direction, not curvature magnitude (since it's computed )
      this.clusterTensor = [1.0, 2.0, 3.0];
    } else {
      // average fundamental tensor of all valid neighbour
      let count = 0;
      let sum = [0.0, 0.0, 0.0];
      this.neighbours.forEach(neighbourCluster => {
        if (neighbourCluster.hasValidCurvature) {
          vec3.add(sum, sum, neighbourCluster.clusterTensor);
          ++count;
        }
      });

      vec3.scale(this.clusterTensor, sum, 1.0 / count);
    }
  }

  // Eigen value will be stored in the third component of eigenVec, i.e. eigenVec = [Eigen Vector.x, Eigen Vector.y, Eigen Value]
  computeEigenVector(efg, eigenVec1, eigenVec2) {
    /* Eigen Value computation
     * 
     * Use equation: det(lamda * I - M) = 0
     * I - Identity matrix
     * M - Matrix to compute Eigen value
     * lamda - Eigen value
     * 
     * rewrite in matrix form:
     *     |lamda   0  |   |e f|
     * det(|           | - |   |  ) = 0
     *     |  0   lamda|   |f g|
     * 
     *        |lamda-e  -f|
     * => det(|           |) = 0
     *        |-f  lamda-g|
     * 
     * => (lamda - e) * (lamda - g) - f^2 = 0
     * => lamda^2 - (e + g)lamda + eg - f^2 = 0
     * 
     * this is a quadratic equation for lamda, where a = 1, b = (-e - g), c = eg - f^2
     * the 2 roots are the 2 eigen values are we looking for
     * */
    let a = 1.0;
    let b = -efg[0] - efg[2];
    let c = efg[0] * efg[2] - efg[1] * efg[1];
    let delta = Math.sqrt(b * b - 4.0 * a * c);

    eigenVec1[2] = (-b + delta) / 2.0 / a;
    eigenVec2[2] = (-b - delta) / 2.0 / a;

    /* Compute eigen vectors:
     * 
     * Use equation (lamda * I - M)v = 0
     * 
     * |lamda-e  -f| |x| = |0|
     * |-f  lamda-g| |y|   |0|
     * 
     * since this matrix is linear dependent (det = 0), we can just use the first row, which gives us:
     * (lamda-e)x - fy = 0
     * 
     * The vector length doesn't matter, we can let x = 1, then:
     * fy = lamda - e
     * y = (lamda - e)/f
     * 
     * thus we have eigen vector: (1, (lamda - e) / f)
     * */

    let v;

    // First eigen vector
    v = vec2.fromValues(1.0, (eigenVec1[2] - efg[0]) / efg[1]);
    vec2.normalize(v, v);
    eigenVec1[0] = v[0];
    eigenVec1[1] = v[1];

    // Second eigen vector
    v = vec2.fromValues(1.0, (eigenVec2[2] - efg[0]) / efg[1]);
    vec2.normalize(v, v);
    eigenVec2[0] = v[0];
    eigenVec2[1] = v[1];

    // we swap them so that the first vector has a larger eigen value, used to determine the larger principle curvature
    if (eigenVec1[2] < eigenVec2[2]) {
      let temp = eigenVec1;
      eigenVec1 = eigenVec2;
      eigenVec2 = temp;
    }
  }

  unifyPrincipalDirections() {
    this.neighbours.forEach(neighbourCluster => {
      if (!neighbourCluster.hasUnifiedDirection) {
        if (vec3.angle(this.maxCurvatureDir, neighbourCluster.maxCurvatureDir) > Math.PI / 2.0) {
          vec3.negate(neighbourCluster.maxCurvatureDir, neighbourCluster.maxCurvatureDir);
        }
        if (vec3.angle(this.minCurvatureDir, neighbourCluster.minCurvatureDir) > Math.PI / 2.0) {
          vec3.negate(neighbourCluster.minCurvatureDir, neighbourCluster.minCurvatureDir);
        }

        neighbourCluster.hasUnifiedDirection = true;

        neighbourCluster.vertices.forEach(vertex => {
          vertex.maxCurvatureDir = neighbourCluster.maxCurvatureDir;
          vertex.minCurvatureDir = neighbourCluster.minCurvatureDir;
        });

        neighbourCluster.unifyPrincipalDirections();
      }
    })
  }
}

class PositionData {
  hashKey = '';
  position = [];
  vertexClusters = [];
  unclusteredVertices = new Set();
  constructor() { }

  addVertexUnclustered(inVertex) {
    this.unclusteredVertices.add(inVertex);
    inVertex.ownerPositionData = this;
  }

  hasIntersection(set1, set2) {
    let result = false;
    set1.forEach(elem1 => {
      set2.forEach(elem2 => {
        if (elem1.ownerPositionData === elem2.ownerPositionData) {
          result = true;
        }
      })
    })

    return result;
  }

  clusterByNormal(instigator = undefined, toAdd = undefined) {
    // To add a new weigthed normals to current set, we apply 2 restrictions:
    // 1. The angle between them must be less than the user specified max
    // 2. The added normal must share at least one edge(possibly 2 consider a cone) within current set
    if (!toAdd) {
      while (this.unclusteredVertices.size > 0) {
        this.clusterByNormal(undefined, this.unclusteredVertices.values().next().value)
      }
      return;
    }

    if (toAdd.ownerCluster) alert('vertex already belongs to another cluster, this should not happen');

    if (!instigator) {

      // no instigator means this is the starting element, just add it to a new set
      let cluster = new VertexCluster();
      cluster.ownerPositionData = toAdd.ownerPositionData;
      cluster.addVertex(toAdd);
      this.vertexClusters.push(cluster);
      this.unclusteredVertices.delete(toAdd);

      // recursively trying to add vertex sharing edges on both sides
      for (let vertexToCluster of this.unclusteredVertices) {
        if (this.hasIntersection(vertexToCluster.neighbours, toAdd.neighbours)) {
          this.clusterByNormal(toAdd, vertexToCluster);
        }
      }

      return;
    } else {
      if (vec3.angle(instigator.nativeNormal, toAdd.nativeNormal) < util.maxSmoothAngle.value / 180.0 * Math.PI) {
        let cluster = instigator.ownerCluster;
        cluster.addVertex(toAdd);
        this.unclusteredVertices.delete(toAdd);

        // recursively trying to add vertex sharing edges on the other side (besides instigator)
        for (let vertexToCluster of this.unclusteredVertices) {
          if (this.hasIntersection(vertexToCluster.neighbours, toAdd.neighbours)) {
            this.clusterByNormal(toAdd, vertexToCluster);
            return; // Since there are only 2 edges can be shared, instigator shares one, we just need to find one more
          }
        }
      } else {
        // if the instigator doesn't satisfy the angle requirement, try finding vertex sharing the other edge

        for (let cluster of toAdd.ownerPositionData.vertexClusters) {
          for (let vertexToCheck of cluster.vertices) {
            if (this.hasIntersection(vertexToCheck.neighbours, toAdd.neighbours) && vec3.angle(vertexToCheck.nativeNormal, toAdd.nativeNormal) < util.maxSmoothAngle.value / 180.0 * Math.PI) {
              // the other side is valid, add it to the set, since 2 sides are both processed, we stop recursion
              cluster.addVertex(toAdd);
              this.unclusteredVertices.delete(toAdd);
              return;
            }
          }
        }

        // toAdd can't be added to any existing sets, he needs a new set
        let cluster = new VertexCluster();
        cluster.ownerPositionData = toAdd.ownerPositionData;
        cluster.addVertex(toAdd);
        this.vertexClusters.push(cluster);
        this.unclusteredVertices.delete(toAdd);

        // recursively trying to add vertex sharing edges on both sides
        for (let vertexToCluster of this.unclusteredVertices) {
          if (this.hasIntersection(vertexToCluster.neighbours, toAdd.neighbours)) {
            this.clusterByNormal(toAdd, vertexToCluster);
            return;
          }
        }
      }
    }
  }

  updateClusterNeighbour() {
    this.vertexClusters.forEach(cluster => cluster.updateClusterNeighbour());
  }

  computeSmoothNormal() {
    this.vertexClusters.forEach(cluster => cluster.computeSmoothNormal());
  }

  computeFundTensor() {
    this.vertexClusters.forEach(cluster => cluster.computeFundTensor());
  }

  tryComputePrincipalCurvatures() {
    this.vertexClusters.forEach(cluster => cluster.tryComputePrincipalCurvatures());
  }

  updateMaxNeighbourAngle() {
    this.vertexClusters.forEach(cluster => cluster.updateMaxNeighbourAngle());
  }

  allClustersHaveValidCurvature() {
    this.vertexClusters.forEach(cluster => {
      if (!cluster.hasValidCurvature) return false;
    });

    return true;
  }

  resetCluster() {
    this.vertexClusters.forEach(cluster =>
      cluster.vertices.forEach(vertex => {
        this.unclusteredVertices.add(vertex);
        vertex.ownerCluster = null;
      })
    )

    this.vertexClusters = [];
  }
}

class PositionHashTable {
  table = new Map();
  constructor() { }

  addVertex(inPosition, inVertex) {
    let key = JSON.stringify(inPosition);

    if (this.table.has(key)) {
      this.table.get(key).addVertexUnclustered(inVertex);
    } else {
      let posData = new PositionData();
      posData.position = inPosition;
      posData.addVertexUnclustered(inVertex);
      this.table.set(key, posData);
    }
  }

  getPositionData(position) {
    let key = JSON.stringify(inPosition);
    return this.table.get(key);
  }

  updateClusterNeighbour() {
    this.table.forEach(posData => posData.updateClusterNeighbour());
  }

  computeSmoothNormal() {
    this.table.forEach(posData => posData.computeSmoothNormal());
  }

  computeFundTensor() {
    this.table.forEach(posData => posData.computeFundTensor());
  }

  tryComputePrincipalCurvatures() {
    this.table.forEach(posData => posData.tryComputePrincipalCurvatures());
  }

  updateMaxNeighbourAngle() {
    this.table.forEach(posData => posData.updateMaxNeighbourAngle());
  }

  allClustersHaveValidCurvature() {
    this.table.forEach(posData => posData.allClustersHaveValidCurvature());
  }

  clusterByNormal() {
    this.table.forEach(posData => {
      posData.resetCluster();
      posData.clusterByNormal();
    });
  }

  getInvalidClusterWithMaxAngle() {
    let result;

    this.table.forEach(posData => {
      posData.vertexClusters.forEach(cluster => {
        if (!cluster.hasValidCurvature) {
          if (!result || result.maxNeighbourAngle < cluster.maxNeighbourAngle) {
            result = cluster;
          }
        }
      });
    });

    return result;
  }
}

class Mesh {
  name;
  translate = vec3.fromValues(0.0, 0.0, 0.0);
  rotation = vec3.fromValues(0.0, 0.0, 0.0);
  scale = vec3.fromValues(1.0, 1.0, 1.0);
  gltf;
  buffers = [];
  vbo = [];
  ibo = [];
  vertCount = [];
  indexCount = [];
  initialized = false;
  materials = [];
  positionHashes = [];
  indexHashes = [];
  faceArrays = [[]];

  // parse the buffer, using the data type we want to pack
  // gl doesn't allow single attribute less than 4 bytes alignment, so we need to pad normal and tanget
  // Position - Float: (4, 4, 4)
  // Tangent - Byte: (1, 1, 1, padding-1)
  // Normal - Byte: (1, 1, 1, padding-1)
  // Smoothed Normal - Byte: (1, 1, 1, padding-1)
  // Texture Coordinate - Unsigned Short: (2, 2) 
  // Curvature - Byte: (1, 1, 1, 1)
  vertexSize = 32;

  constructor(filename) {
    this.name = filename;
    // test if localhost
    var fetchAddr;
    if (location.hostname === "localhost") {
      fetchAddr = 'http://localhost';
    } else {
      fetchAddr = 'https://shinsur.com';
    }

    // fetch gltf file
    fetch(fetchAddr + '/' + filename + '.gltf')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        response.json()
          .then(data => {
            this.gltf = data;

            // download all binaries
            for (let i = 0; i < this.gltf.buffers.length; i++) {
              // fetch binary file
              fetch(fetchAddr + '/' + this.gltf.buffers[i].uri)
                .then(response => {
                  if (!response.ok) {
                    throw new Error('Network response was not ok');
                  }
                  response.blob()
                    .then(_data => {
                      this.buffers.push({ index: i, data: _data });
                      var runParse = new Promise((resolve, reject) => this.parse());
                      runParse.then((results) => this.initialized = true);
                    })
                })
                .catch(err => console.log(err));
            }
          })
      })
      .catch(err => console.log(err));
  }

  parse() {
    // check if we download all buffers
    if (this.buffers.length !== this.gltf.buffers.length) return;

    for (let material of this.gltf.materials) {
      var newMaterial = new Material(material.name);
      var matDetail = material.pbrMetallicRoughness;
      if (matDetail.baseColorFactor) {
        // Use raw color
        var color = matDetail.baseColorFactor;
        newMaterial.useRawColor = true;
        newMaterial.RawColor = vec4.fromValues(color[0], color[1], color[2], color[3]);
      } else if (matDetail.baseColorTexture) {
        // Use texture
        var index = matDetail.baseColorTexture.index;
        newMaterial.diffuse = new Texture2D('./' + this.gltf.textures[index].name);
      } else {
        console.log('[Warning] Material: \'' + material.name + '\'is not supported.');
      }
      this.materials.push(newMaterial);
    }

    // 1 material slot map to 1 vbo and 1 ibo
    for (let i = 0; i < this.materials.length; i++) {
      this.vertCount[i] = 0;
      this.indexCount[i] = 0;
    }

    // calculate the total buf size
    for (let mesh of this.gltf.meshes) {
      for (let primitive of mesh.primitives) {
        var index = primitive.material;
        this.vertCount[index] += this.gltf.accessors[primitive.attributes.POSITION].count;
        this.indexCount[index] += this.gltf.accessors[primitive.indices].count;
      }
    }

    // create the final buf arrays
    var outputBuffer = [];
    var indexBuffer = [];
    for (let i = 0; i < this.materials.length; i++) {
      outputBuffer[i] = new ArrayBuffer(this.vertCount[i] * this.vertexSize);
      indexBuffer[i] = new ArrayBuffer(4 * this.indexCount[i]);
    }

    // clear vertex and index count so we can accumulate offsets later
    for (let i = 0; i < this.materials.length; i++) {
      this.vertCount[i] = 0;
      this.indexCount[i] = 0;
    }

    // parse mesh data
    var parsePrimitiveAsync = [];
    for (let mesh of this.gltf.meshes) {
      for (let primitive of mesh.primitives) {
        var index = primitive.material;
        //this.parsePrimitive(primitive, outputBuffer[index], indexBuffer[index]);

        parsePrimitiveAsync.push(new Promise((resolve, reject) => {
          return this.parsePrimitive(primitive, outputBuffer[index], indexBuffer[index], resolve);
        }));
      }
    }
    Promise.all(parsePrimitiveAsync).then(val => {
      this.initialized = true;
      this.recomputeSmoothNormal();
    });
  }

  parsePrimitive(primitive, outputBuffer, indexBuffer, resolve) {
    var matIndex = primitive.material;

    var accessors = this.gltf.accessors;
    var bufferViews = this.gltf.bufferViews;

    var attributes = primitive.attributes;

    var indIndex = primitive.indices;
    var posIndex = attributes.POSITION;
    var tanIndex = attributes.TANGENT;
    var norIndex = attributes.NORMAL;
    var uvIndex = attributes.TEXCOORD_0;

    var indBV = accessors[indIndex].bufferView;
    var posBV = accessors[posIndex].bufferView;
    var tanBV = accessors[tanIndex].bufferView;
    var norBV = accessors[norIndex].bufferView;
    var uvBV = accessors[uvIndex].bufferView;

    Promise.allSettled([
      this.buffers[bufferViews[indBV].buffer].data.arrayBuffer(),
      this.buffers[bufferViews[posBV].buffer].data.arrayBuffer(),
      this.buffers[bufferViews[tanBV].buffer].data.arrayBuffer(),
      this.buffers[bufferViews[norBV].buffer].data.arrayBuffer(),
      this.buffers[bufferViews[uvBV].buffer].data.arrayBuffer()])
      .then((results) => {
        var indBuf = results[0].value;
        var posBuf = results[1].value;
        var tanBuf = results[2].value;
        var norBuf = results[3].value;
        var uvBuf = results[4].value;

        var indDV = new DataView(indBuf);
        var posDV = new DataView(posBuf);
        var tanDV = new DataView(tanBuf);
        var norDV = new DataView(norBuf);
        var uvDV = new DataView(uvBuf);

        var indOffset = (bufferViews[indBV].byteOffset ? bufferViews[indBV].byteOffset : 0) + (accessors[indIndex].byteOffset ? accessors[indIndex].byteOffset : 0);
        var posOffset = (bufferViews[posBV].byteOffset ? bufferViews[posBV].byteOffset : 0) + (accessors[posIndex].byteOffset ? accessors[posIndex].byteOffset : 0);
        var tanOffset = (bufferViews[tanBV].byteOffset ? bufferViews[tanBV].byteOffset : 0) + (accessors[tanIndex].byteOffset ? accessors[tanIndex].byteOffset : 0);
        var norOffset = (bufferViews[norBV].byteOffset ? bufferViews[norBV].byteOffset : 0) + (accessors[norIndex].byteOffset ? accessors[norIndex].byteOffset : 0);
        var uvOffset = (bufferViews[uvBV].byteOffset ? bufferViews[uvBV].byteOffset : 0) + (accessors[uvIndex].byteOffset ? accessors[uvIndex].byteOffset : 0);

        var posStride = bufferViews[posBV].byteStride;
        var tanStride = bufferViews[tanBV].byteStride;
        var norStride = bufferViews[norBV].byteStride;
        var uvStride = bufferViews[uvBV].byteStride;

        // vertex count is accumulative, used to determine offset of this mesh
        var currVertCount = this.vertCount[matIndex];
        this.vertCount[matIndex] += accessors[posIndex].count;
        var outputView = new DataView(outputBuffer);

        // Create the hash tables, these hash tables are used in later calculation for smoothed normal & curvature
        // Position hash table
        let posHashTable;
        if (this.positionHashes[matIndex]) {
          posHashTable = this.positionHashes[matIndex];
        } else {
          posHashTable = new PositionHashTable();
          this.positionHashes[matIndex] = posHashTable;
        }

        // Index hash table
        let indexHashTable;
        if (this.indexHashes[matIndex]) {
          indexHashTable = this.indexHashes[matIndex];
        } else {
          indexHashTable = new IndexHashTable();
          this.indexHashes[matIndex] = indexHashTable;
        }

        // Processing input and upload data to GPU
        for (let i = currVertCount; i < this.vertCount[matIndex]; i++) {
          // Position
          // assuming position type float32 and 3 components, x100 to compensate Maya scale
          var posVal = [
            posDV.getFloat32(posOffset + (i - currVertCount) * posStride, true) * 100.0,
            posDV.getFloat32(posOffset + 4 + (i - currVertCount) * posStride, true) * 100.0,
            posDV.getFloat32(posOffset + 8 + (i - currVertCount) * posStride, true) * 100.0
          ];
          outputView.setFloat32(i * this.vertexSize + 0, posVal[0], true);
          outputView.setFloat32(i * this.vertexSize + 4, posVal[1], true);
          outputView.setFloat32(i * this.vertexSize + 8, posVal[2], true);

          // Native tangent
          // assuming tangent type float32 and 4 components
          let tanVal = [
            tanDV.getFloat32(tanOffset + (i - currVertCount) * tanStride, true),
            tanDV.getFloat32(tanOffset + 4 + (i - currVertCount) * tanStride, true),
            tanDV.getFloat32(tanOffset + 8 + (i - currVertCount) * tanStride, true),
            tanDV.getFloat32(tanOffset + 12 + (i - currVertCount) * tanStride, true)
          ];
          outputView.setInt8(i * this.vertexSize + 12, tanVal[0] * 0x7F, true);
          outputView.setInt8(i * this.vertexSize + 13, tanVal[1] * 0x7F, true);
          outputView.setInt8(i * this.vertexSize + 14, tanVal[2] * 0x7F, true);
          outputView.setInt8(i * this.vertexSize + 15, tanVal[3], true); // bitangent sign, no need to convert

          // Native normal
          // assuming normal type float32 and 3 components
          var norVal = [
            norDV.getFloat32(norOffset + (i - currVertCount) * norStride, true) * 0x7F,
            norDV.getFloat32(norOffset + 4 + (i - currVertCount) * norStride, true) * 0x7F,
            norDV.getFloat32(norOffset + 8 + (i - currVertCount) * norStride, true) * 0x7F
          ];
          outputView.setInt8(i * this.vertexSize + 16, norVal[0], true);
          outputView.setInt8(i * this.vertexSize + 17, norVal[1], true);
          outputView.setInt8(i * this.vertexSize + 18, norVal[2], true);
          outputView.setInt8(i * this.vertexSize + 19, 0); // padding

          // Populate hash maps
          let vertexData = new VertexData(i, norVal, tanVal);
          posHashTable.addVertex(posVal, vertexData);
          indexHashTable.addVertex(vertexData);

          // Smoothed normal, only upload default here, calculate will be done after all vertices have been processed
          // initialize smoothed normal as [100, 0 , 100]
          outputView.setInt8(i * this.vertexSize + 20, 100, true);
          outputView.setInt8(i * this.vertexSize + 21, 0, true);
          outputView.setInt8(i * this.vertexSize + 22, 100, true);
          outputView.setInt8(i * this.vertexSize + 23, 0); // padding

          // Texture Coordinate
          // assuming uv type float32 and 4 components
          outputView.setUint16(i * this.vertexSize + 24, uvDV.getFloat32(uvOffset + (i - currVertCount) * uvStride, true) * 0xFFFF, true);
          outputView.setUint16(i * this.vertexSize + 26, uvDV.getFloat32(uvOffset + 4 + (i - currVertCount) * uvStride, true) * 0xFFFF, true);

          // Curvature, only upload default here, calculate will be done after all vertices have been processed
          // initialize curvature as [0, 100, 0]
          outputView.setInt8(i * this.vertexSize + 28, 0, true);
          outputView.setInt8(i * this.vertexSize + 29, 100, true);
          outputView.setInt8(i * this.vertexSize + 30, 0, true);
          outputView.setInt8(i * this.vertexSize + 31, 100, true);
        }

        // initialize index buffer, assuming data is unsigned short
        var currIndexCount = this.indexCount[matIndex];
        this.indexCount[matIndex] += accessors[indIndex].count;
        var indexView = new DataView(indexBuffer);

        // Upload index buffer and calculate smoothed normal
        for (let i = currIndexCount; i < this.indexCount[matIndex]; i += 3) {
          // Load vertices indices per triangle from input
          let index1 = indDV.getInt16(indOffset + (i - currIndexCount) * 2, true) + currVertCount;
          let index2 = indDV.getInt16(indOffset + (i + 1 - currIndexCount) * 2, true) + currVertCount;
          let index3 = indDV.getInt16(indOffset + (i + 2 - currIndexCount) * 2, true) + currVertCount;

          // Get the three vertex object from hash table
          let vertexObj1 = indexHashTable.getVertex(index1);
          let vertexObj2 = indexHashTable.getVertex(index2);
          let vertexObj3 = indexHashTable.getVertex(index3);

          // Get or create the face array
          let faceArray;
          if (this.faceArrays[matIndex]) {
            faceArray = this.faceArrays[matIndex];
          } else {
            faceArray = [];
            this.faceArrays[matIndex] = faceArray;
          }

          // Populate face array with this face
          let faceData = new FaceData(vertexObj1, vertexObj2, vertexObj3);
          faceData.calculateWeightedNormal();
          faceArray.push(faceData);

          // populate neighbours, note we use PositionData instead of vertex data, since multiple vertices can share the same postion
          vertexObj1.neighbours.add(vertexObj2).add(vertexObj3);
          vertexObj2.neighbours.add(vertexObj1).add(vertexObj3);
          vertexObj3.neighbours.add(vertexObj1).add(vertexObj2);

          // Fill out the index buffer
          indexView.setUint32(i * 4, index1, true);
          indexView.setUint32(i * 4 + 4, index2, true);
          indexView.setUint32(i * 4 + 8, index3, true);
        }

        // upload vertex buffer, assuming only 1 primitve and per mesh
        this.vbo[matIndex] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo[matIndex]);
        gl.bufferData(gl.ARRAY_BUFFER, outputBuffer, gl.STATIC_DRAW);

        // upload index buffer
        this.ibo[matIndex] = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo[matIndex]);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexBuffer, gl.STATIC_DRAW);

        resolve('success');
      })
      .catch(err => console.log(err));
  }

  bind(Index) {
    if (!this.initialized) {
      console.log('loading...');
      return;
    }

    // bind material
    this.materials[Index].bind();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo[Index]);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo[Index]);

    // position
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, this.vertexSize, 0);

    // tangent
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.BYTE, true, this.vertexSize, 12);

    // normal
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.BYTE, true, this.vertexSize, 16);

    // smoothed normal
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 4, gl.BYTE, true, this.vertexSize, 20);

    // texture UV
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 2, gl.UNSIGNED_SHORT, true, this.vertexSize, 24);

    // curvature
    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 4, gl.BYTE, true, this.vertexSize, 28);

  }

  draw() {
    if (!this.initialized) {
      console.log('loading...');
      return;
    }

    if (util.recomputeSmoothNormal) {
      this.recomputeSmoothNormal();
    }

    // Compute model matrix
    var matModel = mat4.fromRotationTranslationScale([], quat.fromEuler([], this.rotation[0], this.rotation[1], this.rotation[2]), this.translate, this.scale);

    // Set uniform
    Program.setUniformMatrix4fv('MatModel', matModel);

    // draw all meshes
    for (let i = 0; i < this.indexCount.length; i++) {
      this.bind(i);
      gl.drawElements(gl.TRIANGLES, this.indexCount[i], gl.UNSIGNED_INT, 0);
      util.totalTries += this.indexCount[i] / 3;
    }
  }

  recomputeSmoothNormal() {
    if (!this.initialized) {
      console.log('[Log] Normal recomputing skipped, mesh: \"' + this.name + '\" is not initialized');
      return;
    }

    // for all meshes
    for (let matIndex = 0; matIndex < this.materials.length; matIndex++) {
      let posHashTable = this.positionHashes[matIndex];
      let indexHashTable = this.indexHashes[matIndex];
      let faceArray = this.faceArrays[matIndex];

      posHashTable.clusterByNormal(); // Divde all vertices at this position into clusters depending on their normal differences
      posHashTable.updateClusterNeighbour(); // Initialize cluster neighbour data, used to sort them later for smooth curvature
      posHashTable.computeSmoothNormal(); // Compute smooth normal per cluster

      // for each face, calculate the face curvature
      faceArray.forEach(element => element.computeWeingartenMatrix()); // compute per face Weingarten Matrix, or fundamental tensor, weight and save to vertices
      posHashTable.computeFundTensor(); // compute per vertex fundamental tensor

      // reset flag before we start next pass
      posHashTable.table.forEach(posData => {
        posData.vertexClusters.forEach(cluster => cluster.hasUnifiedDirection = false);
      });

      // some vertices won't have meaningful principal curvature directions (e.g. on perfect sphere), we smooth them using neighbour data
      let finish = false;

      // First, attempt to compute principal curvature for all clusters
      posHashTable.tryComputePrincipalCurvatures(); 
      // Then, compute the maximum angle among neighbour vectors, this is a rough standard for finding most 'reasonable' cluster to smooth next
      posHashTable.updateMaxNeighbourAngle();

      // Keep searching for clusters with most reasonable valid neighbours and average tensor from those neighbours
      while (!finish) {
        let clusterToSmooth = posHashTable.getInvalidClusterWithMaxAngle();
        if (clusterToSmooth) {
          clusterToSmooth.smoothFundTensor();
          clusterToSmooth.tryComputePrincipalCurvatures();
          clusterToSmooth.neighbours.forEach(neighbourCluster=> {
            neighbourCluster.updateMaxNeighbourAngle();
          })
        } else {
          finish = true;
        }
      }

      // since principal directions can go either way, we have to make sure they maintain roughly the same direciton
      // inverse each vector that goes the other way from surrounding ones
      while (true) {
        // loop through all clusters to find the first one that doesn't have unified direction
        let startingCluster;
        for (let posData of posHashTable.table) {
          if (!startingCluster) {
            for (let cluster of posData[1].vertexClusters) {
              if (!cluster.hasUnifiedDirection) {
                startingCluster = cluster;
                break;
              }
            }
          } else {
            break;
          }
        }

        if (!startingCluster) break;

        // initialize the starting cluster
        startingCluster.hasUnifiedDirection = true;
        startingCluster.vertices.forEach(vertex => {
          vertex.maxCurvatureDir = startingCluster.maxCurvatureDir;
          vertex.minCurvatureDir = startingCluster.minCurvatureDir;
        });

        // deep first search all the neighbours
        startingCluster.unifyPrincipalDirections();
      }

      // upload our updated vertex data
      indexHashTable.table.forEach(vertData => {
        // smooth normal
        let outputBuffer = new Int8Array(4);
        outputBuffer[0] = vertData.smoothedNormal[0] * 0x7F;
        outputBuffer[1] = vertData.smoothedNormal[1] * 0x7F;
        outputBuffer[2] = vertData.smoothedNormal[2] * 0x7F;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo[matIndex]);
        gl.bufferSubData(gl.ARRAY_BUFFER, vertData.index * this.vertexSize + 20, outputBuffer, 0, 3);

        // max principal curvature
        outputBuffer[0] = vertData.maxCurvatureDir[0] * 0x7F;
        outputBuffer[1] = vertData.maxCurvatureDir[1] * 0x7F;
        outputBuffer[2] = vertData.maxCurvatureDir[2] * 0x7F;
        outputBuffer[3] = vertData.maxCurvature * 0x7F;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo[matIndex]);
        gl.bufferSubData(gl.ARRAY_BUFFER, vertData.index * this.vertexSize + 28, outputBuffer, 0, 4);

        // TODO: we probably need to upload smoothed tangent as well, if we are gonna implement normal mapping later
      });
    }
  }
}

// a simple plane mesh to display framebuffer
class RenderPlane {
  posX = 0;
  posY = 0;
  width;
  height;
  vbo;
  ibo;
  // gl doesn't allow single attribute less than 4 bytes alignment
  // x-f4, y-f4, z-f4 = 12 bytes;
  vertexSize = 12;

  constructor(_width = gl.canvas.width, _height = gl.canvas.height) {
    this.width = _width;
    this.height = _height;

    var left = this.posX / gl.canvas.height * 2.0 - 1.0;
    var right = (this.posX + this.width) / gl.canvas.width * 2.0 - 1.0;
    var bottom = this.posY / gl.canvas.height * 2.0 - 1.0;
    var top = (this.posY + this.height) / gl.canvas.height * 2.0 - 1.0;

    var outputBuffer = new ArrayBuffer(4 * this.vertexSize);
    var dv = new DataView(outputBuffer);
    dv.setFloat32(0, left, true); dv.setFloat32(4, bottom, true); dv.setFloat32(8, 0.0, true);
    dv.setFloat32(12, right, true); dv.setFloat32(16, bottom, true); dv.setFloat32(20, 0.0, true);
    dv.setFloat32(24, left, true); dv.setFloat32(28, top, true); dv.setFloat32(32, 0.0, true);
    dv.setFloat32(36, right, true); dv.setFloat32(40, top, true); dv.setFloat32(44, 0.0, true);
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, outputBuffer, gl.STATIC_DRAW);

    // setup attribute
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, this.vertexSize, 0);

    var indexBuffer = [0, 1, 2, 3];

    this.ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(indexBuffer), gl.STATIC_DRAW);
  }

  bind() {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);

    // position
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, this.vertexSize, 0);

    // Set uniform
    Program.setUniform2fv('DrawSize', new Float32Array([this.width, this.height]));
  }

  draw() {
    this.bind();

    gl.drawElements(gl.TRIANGLE_STRIP, 4, gl.UNSIGNED_SHORT, 0);
  }
}

export { Mesh, RenderPlane };