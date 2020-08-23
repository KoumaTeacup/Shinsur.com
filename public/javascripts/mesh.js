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
  nativeTangent = [0.0, 0.0, 0.0];
  weightedNormal = [0.0, 0.0, 0.0];
  adjacentVertices = new Set();
  constructor(_index, _normal, _tangent) {
    this.index = _index;
    this.nativeNormal = _normal;
    this.nativeTangent = _tangent;
  }
}

class ClusteredVertices {
  vertices = new Set();
  neighbours = new Set();
  constructor() {}
}

class PositionData {
  hashKey = '';
  position = [0.0, 0.0, 0.0];
  clusteredVertices = [];
  unclusteredVertices = [];
  constructor() {}
}

class PositionHashTable {
  table = new Map();
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

        // Create the hash map, this will be member data so we can adjust it later at run time
        let vertexHash;
        if (this.positionHashes[matIndex]) {
          vertexHash = this.positionHashes[matIndex];
        } else {
          vertexHash = new Map();
          this.positionHashes[matIndex] = vertexHash;
        }

        for (let i = currVertCount; i < this.vertCount[matIndex]; i++) {
          // assuming position type float32 and 3 components, x100 to compensate Maya scale
          var posVal = [
            posDV.getFloat32(posOffset + (i - currVertCount) * posStride, true) * 100.0,
            posDV.getFloat32(posOffset + 4 + (i - currVertCount) * posStride, true) * 100.0,
            posDV.getFloat32(posOffset + 8 + (i - currVertCount) * posStride, true) * 100.0
          ];
          outputView.setFloat32(i * this.vertexSize + 0, posVal[0], true);
          outputView.setFloat32(i * this.vertexSize + 4, posVal[1], true);
          outputView.setFloat32(i * this.vertexSize + 8, posVal[2], true);

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

          // Populate vertex hash by key position
          var posDataAsKey = vec3.fromValues(
            outputView.getFloat32(i * this.vertexSize + 0, true),
            outputView.getFloat32(i * this.vertexSize + 4, true),
            outputView.getFloat32(i * this.vertexSize + 8, true)
          );

          // Initialize vertex position map, this helps us compute smoothed normal

          var newElem = { index: i, nativeNormal: norVal, tangent: tanVal, weightedNormal: [0.0, 0.0, 0.0], adjacentElem: new Set() };
          //let newElem = new VertexData(i, norVal, tanVal);
          if (!vertexHash.has(JSON.stringify(posDataAsKey))) {
            vertexHash.set(JSON.stringify(posDataAsKey), [newElem]);
          } else {
            var hashVal = vertexHash.get(JSON.stringify(posDataAsKey));
            hashVal.push(newElem);
          }

          // initialize smoothed normal as [100, 0 , 100]
          outputView.setInt8(i * this.vertexSize + 20, 100, true);
          outputView.setInt8(i * this.vertexSize + 21, 0, true);
          outputView.setInt8(i * this.vertexSize + 22, 100, true);
          outputView.setInt8(i * this.vertexSize + 23, 0); // padding

          // assuming uv type float32 and 4 components
          outputView.setUint16(i * this.vertexSize + 24, uvDV.getFloat32(uvOffset + (i - currVertCount) * uvStride, true) * 0xFFFF, true);
          outputView.setUint16(i * this.vertexSize + 26, uvDV.getFloat32(uvOffset + 4 + (i - currVertCount) * uvStride, true) * 0xFFFF, true);

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
          // Load vertices indices per triangle
          var index1 = indDV.getInt16(indOffset + (i - currIndexCount) * 2, true) + currVertCount;
          var index2 = indDV.getInt16(indOffset + (i + 1 - currIndexCount) * 2, true) + currVertCount;
          var index3 = indDV.getInt16(indOffset + (i + 2 - currIndexCount) * 2, true) + currVertCount;

          // Read their positions from the array buffer
          var pos1 = vec3.fromValues(
            outputView.getFloat32(index1 * this.vertexSize + 0, true), // x
            outputView.getFloat32(index1 * this.vertexSize + 4, true), // y
            outputView.getFloat32(index1 * this.vertexSize + 8, true)  // z
          )
          var pos2 = vec3.fromValues(
            outputView.getFloat32(index2 * this.vertexSize + 0, true), // x
            outputView.getFloat32(index2 * this.vertexSize + 4, true), // y
            outputView.getFloat32(index2 * this.vertexSize + 8, true)  // z
          )
          var pos3 = vec3.fromValues(
            outputView.getFloat32(index3 * this.vertexSize + 0, true), // x
            outputView.getFloat32(index3 * this.vertexSize + 4, true), // y
            outputView.getFloat32(index3 * this.vertexSize + 8, true)  // z
          )

          // fetch the vertex index data from the position hash table
          var vertexOfPos1 = vertexHash.get(JSON.stringify(pos1));
          var vertexOfPos2 = vertexHash.get(JSON.stringify(pos2));
          var vertexOfPos3 = vertexHash.get(JSON.stringify(pos3));

          var indexElem1 = vertexOfPos1.find(element => element.index === index1);
          var indexElem2 = vertexOfPos2.find(element => element.index === index2);
          var indexElem3 = vertexOfPos3.find(element => element.index === index3);

          // populate adjacentElem property for each index 
          indexElem1.adjacentElem.add(vertexOfPos2).add(vertexOfPos3);
          indexElem2.adjacentElem.add(vertexOfPos1).add(vertexOfPos3);
          indexElem3.adjacentElem.add(vertexOfPos1).add(vertexOfPos2);

          // calculated weighted normal for each vertex of this triangle and store them in hashtable according to their indices
          this.calculateWeightedNormal(indexElem1.weightedNormal, pos1, pos2, pos3);
          this.calculateWeightedNormal(indexElem2.weightedNormal, pos2, pos3, pos1);
          this.calculateWeightedNormal(indexElem3.weightedNormal, pos3, pos1, pos2);

          // Fill out the index buffer
          indexView.setUint32(i * 4, index1, true);
          indexView.setUint32(i * 4 + 4, index2, true);
          indexView.setUint32(i * 4 + 8, index3, true);

          // Create the face hash map, used for computing curvature
          let faceArray;
          if (this.faceArrays[matIndex]) {
            faceArray = this.faceArrays[matIndex];
          } else {
            faceArray = [];
            this.faceArrays[matIndex] = faceArray;
          }

          faceArray.push({ v1: index1, v2: index2, v3: index3 });
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

  // Note accumulatedSum is a js array of floats, not vec3
  calculateWeightedNormal(outNormal, pos1, pos2, pos3) {
    // weighted normal = v1 x v2 / |v1|^2 / |v2|^2
    // Paper reference: Weights for Computing Vertex Normals from Facet Normals - Nelson Max

    var v1 = [], v2 = [], weightedNormal = [];
    vec3.sub(v1, pos2, pos1);
    vec3.sub(v2, pos3, pos1);
    vec3.scale(weightedNormal, vec3.cross([], v1, v2), 1.0 / vec3.sqrLen(v1) / vec3.sqrLen(v2));

    // gltf or other mesh format usually output the same vertex as different individual ones (with different 
    // index) in the vertex array, because their normals can vary, however if a vertex's normal doesn't
    // change across multiple triangles, only 1 vertex per normal is outputed. To consider this situation,
    // when doing weighted normals, we have to accumulate weighted normals from all triangles this
    // vertex is in.
    vec3.add(outNormal, outNormal, weightedNormal);
  }

  clusterNormal(instigator, toAdd, setToAdd, indexArray, arrayOfSets, setOfProcessed) {
    // To add a new weigthed normals to current set, we apply 2 restrictions:
    // 1. The angle between them must be less than the user specified max
    // 2. The added normal must share at least one edge(possibly 2 consider a cone) within current set
    if (!instigator) {
      // no instigator means this is the starting element, just add it to a new set
      let newSet = new Set();
      newSet.add(toAdd);
      arrayOfSets.push({ vertSet: newSet, valid: false });
      setOfProcessed.add(toAdd);

      // recursively trying to add vertex sharing edges on both sides
      for (let element of indexArray) {
        if (!setOfProcessed.has(element) && this.hasIntersection(element.adjacentElem, toAdd.adjacentElem)) {
          this.clusterNormal(toAdd, element, newSet, indexArray, arrayOfSets, setOfProcessed);
        }
      }

      return;
    } else {
      if (setOfProcessed.has(toAdd)) {
        // do nothing and return if this element is already in a set
        return;
      }

      if (vec3.angle(instigator.nativeNormal, toAdd.nativeNormal) < util.maxSmoothAngle.value / 180.0 * Math.PI) {
        setToAdd.add(toAdd);
        setOfProcessed.add(toAdd);
        // recursively trying to add vertex sharing edges on the other side (besides instigator)
        for (let element of indexArray) {
          if (!setOfProcessed.has(element) && this.hasIntersection(element.adjacentElem, toAdd.adjacentElem)) {
            this.clusterNormal(toAdd, element, setToAdd, indexArray, arrayOfSets, setOfProcessed);
            return; // Since there are only 2 edges can be shared, instigator shares one, we just need to find one more
          }
        }
      } else {
        // if the instigator doesn't satisfy the angle requirement, try the other adjacent triangle

        for (let set of arrayOfSets) {
          for (let item of set.vertSet) {
            if (this.hasIntersection(item.adjacentElem, toAdd.adjacentElem) && vec3.angle(item.nativeNormal, toAdd.nativeNormal) < util.maxSmoothAngle.value / 180.0 * Math.PI) {
              // the other side is valid, add it to the set, since 2 sides are both processed, we stop recursion
              set.add(toAdd);
              return;
            }
          }
        }

        // toAdd can't be added to any existing sets, he needs a new set
        let newSet = new Set();
        newSet.add(toAdd);
        arrayOfSets.push({ vertSet: newSet, valid: false });
        setOfProcessed.add(toAdd);
        // recursively trying to add vertex sharing edges on the other side (besides instigator)
        for (let element of indexArray) {
          if (!setOfProcessed.has(element) && this.hasIntersection(element.adjacentElem, toAdd.adjacentElem)) {
            this.clusterNormal(toAdd, element, newSet, indexArray, arrayOfSets, setOfProcessed);
            return;
          }
        }
      }
    }
  }

  hasIntersection(set1, set2) {
    for (let elem of set1) {
      if (set2.has(elem)) return true;
    }

    return false;
  }

  recomputeSmoothNormal() {
    if (!this.initialized) {
      console.log('[Log] Normal recomputing skipped, mesh: \"' + this.name + '\" is not initialized');
      return;
    }

    // for all meshes
    for (let matIndex = 0; matIndex < this.materials.length; matIndex++) {
      // Position mapped to [{index, normal, tangent, weighted normal, adjacent vertices, clustered sets}]
      let vertexHash = this.positionHashes[matIndex];

      // Index mapped to {position, smoothed normal, smoothed tangent, Weingarten Martix, total curvature weight}
      let indexMap = new Map();

      // Position mapped to [{Set of clustered vertices, Is set Valid}]
      let posToClusteredSets = new Map();

      for (let perPos of vertexHash) {
        posToClusteredSets.set(perPos[0], []);

        // we want to divide all weighted normal of this vertex into different sets to combine
        this.clusterNormal(undefined, perPos[1][0], undefined, perPos[1], posToClusteredSets.get(perPos[0]), new Set());

        for (let setObj of posToClusteredSets.get(perPos[0])) {
          // For each set, add up weighted normals
          let accumulatedNormal = [0.0, 0.0, 0.0];
          let accumulatedTangent = [0.0, 0.0, 0.0];
          setObj.vertSet.forEach(element => {
            vec3.add(accumulatedNormal, accumulatedNormal, element.weightedNormal);
            vec3.add(accumulatedTangent, accumulatedTangent, element.tangent); // we don't apply weights on tangent, just simple linear interpolation
          });

          vec3.normalize(accumulatedNormal, accumulatedNormal);
          vec3.normalize(accumulatedTangent, accumulatedTangent);

          // upload smoothed normal buffer
          setObj.vertSet.forEach(element => {
            // For each vertex with unique tangent data, compute new tangent using the smoothed normal
            let bitangent = vec3.cross([], accumulatedNormal, accumulatedTangent);
            let newTangent = vec3.cross([], bitangent, accumulatedNormal);
            vec3.normalize(newTangent, newTangent);

            // Fill out the index map for curvature calculation
            indexMap.set(element.index, { pos: perPos[0], snormal: accumulatedNormal, tangent: newTangent, fundTensor: [0.0, 0.0, 0.0], totalTensorWeight:0.0 });

            // upload vertex buffer with new smoothed normals
            let outputBuffer = new Int8Array(3);
            outputBuffer[0] = accumulatedNormal[0] * 0x7F;
            outputBuffer[1] = accumulatedNormal[1] * 0x7F;
            outputBuffer[2] = accumulatedNormal[2] * 0x7F;

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo[matIndex]);
            gl.bufferSubData(gl.ARRAY_BUFFER, element.index * this.vertexSize + 20, outputBuffer, 0, 3);

            // TODO: we probably need to upload smoothed tangent as well, if we are gonna implement normal textures later
          });
        }
      }

      let faceArray = this.faceArrays[matIndex];
      // for each face, calculate the face curvature
      for (let face of faceArray) {
        this.computeWeingartenMatrix(indexMap.get(face.v1), indexMap.get(face.v2), indexMap.get(face.v3));
      }

      for (let perPos of vertexHash) {
        // merge curvatures basing on the same cluster as smoothed normal
        for (let setObj of posToClusteredSets.get(perPos[0])) {
          // Calculate weighted tensor
          let accumulatedTensor = [0.0, 0.0, 0.0];
          let accumulatedWeight = 0.0;

          setObj.vertSet.forEach(element => {
            let vertElem = indexMap.get(element.index);
            vec3.add(accumulatedTensor, accumulatedTensor, vertElem.fundTensor);
            accumulatedWeight += vertElem.totalTensorWeight;
          });

          vec3.scale(accumulatedTensor, accumulatedTensor, 1.0 / accumulatedWeight);

          // Save the weighted tensor
          setObj.vertSet.forEach(element => {
            let vertElem = indexMap.get(element.index);
            vertElem.fundTensor = accumulatedTensor;
          });

          // calculate principal curvatures
          let principal1 = [], principal2 = [];
          this.computeEigenVector(accumulatedTensor, principal1, principal2);

          // Calculate the max&min curvature, is they are close enough, it means we are on a sphere, curvatures are the same on every direction
          // We don't like uncertainty so I'm gonna deal with them
          let maxCurvature = principal1[2];
          let minCurvature = principal2[2];
          //if (maxCurvature - minCurvature > 0.0001) {
          if (true) {
            // for all verts that are not on pefect sphere, we process them, upload the data and mark them valid
            setObj.valid = true;

            // project principle curvature direction from vertex space to object space, so we don't won't burden GPU for calculation
            setObj.vertSet.forEach(element => {
              let vertElem = indexMap.get(element.index);
              let n = vertElem.snormal;
              let tan = vertElem.tangent;
              let biTan = vec3.cross([], n, tan);
              let m = mat3.fromValues(
                tan[0], biTan[0], n[0],
                tan[1], biTan[1], n[1],
                tan[2], biTan[2], n[2]
              )

              let maxPrincipleDir = [principal1[0], principal1[1], 0.0];
              if (maxPrincipleDir[1] < 0) vec3.scale(maxPrincipleDir, maxPrincipleDir, -1.0);
              let minPrincipleDir = [principal2[0], principal2[1], 0.0];
              if (minPrincipleDir[1] < 0) vec3.scale(minPrincipleDir, minPrincipleDir, -1.0);

              vec3.transformMat3(maxPrincipleDir, maxPrincipleDir, m);
              vec3.transformMat3(minPrincipleDir, minPrincipleDir, m);

              vec3.normalize(maxPrincipleDir, maxPrincipleDir);
              vec3.normalize(minPrincipleDir, minPrincipleDir);

              // upload curvature
              let outputBuffer = new Int8Array(3);
              outputBuffer[0] = maxPrincipleDir[0] * 0x7F;
              outputBuffer[1] = maxPrincipleDir[1] * 0x7F;
              outputBuffer[2] = maxPrincipleDir[2] * 0x7F;

              //outputBuffer[0] = maxCurvature * 0x7F;
              //outputBuffer[1] = maxCurvature * 0x7F;
              //outputBuffer[2] = maxCurvature * 0x7F;


              gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo[matIndex]);
              gl.bufferSubData(gl.ARRAY_BUFFER, element.index * this.vertexSize + 28, outputBuffer, 0, 3);
            });
          }
        }
      }

      // We want to give those verts on perfect sphere a meaningful curvature direction, try to populate them using surrounding vertex's data
      //while (!this.checkAllCurvatureValid(vertexHash, posToClusteredSets)) {
      //  for (let perPos of vertexHash) {
      //    for (let setObj of posToClusteredSets.get(perPos[0])) {
      //      // for each clustered vertex set, check if 
      //    }
      //  }
      //}


    }
  }

  computeWeingartenMatrix(vertElem1, vertElem2, vertElem3) {
    // Paper reference: Estimating Curvatures and Their Derivatives on Triangle Meshes - Szymon Rusinkiewicz, Princeton University
    // this algorithm computes 3 normal derivatives along three edges of the triangle, and solve them by least squares method to
    // estimate the face curvature

    // position of each vertices
    let pos1 = JSON.parse(vertElem1.pos);
    let pos2 = JSON.parse(vertElem2.pos);
    let pos3 = JSON.parse(vertElem3.pos);

    // normal vectors of each vertices
    let n1 = vertElem1.snormal;
    let n2 = vertElem2.snormal;
    let n3 = vertElem3.snormal;

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

    let tan1 = vertElem1.tangent;
    let tan2 = vertElem2.tangent;
    let tan3 = vertElem3.tangent;
    let biTan1 = vec3.cross([], n1, tan1);
    let biTan2 = vec3.cross([], n2, tan2);
    let biTan3 = vec3.cross([], n3, tan3);

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
    let voronoiAreas = this.calculateVoronoiArea([p1[0], p1[1]], [p2[0], p2[1]], [p3[0], p3[1]]);

    // Save the weighted Weingarten matrix
    vec3.add(vertElem1.fundTensor, vertElem1.fundTensor, vec3.scale([], efg1, voronoiAreas[0]));
    vec3.add(vertElem2.fundTensor, vertElem2.fundTensor, vec3.scale([], efg2, voronoiAreas[0]));
    vec3.add(vertElem3.fundTensor, vertElem3.fundTensor, vec3.scale([], efg3, voronoiAreas[0]));

    // Update the total weight
    vertElem1.totalTensorWeight += voronoiAreas[0];
    vertElem2.totalTensorWeight += voronoiAreas[1];
    vertElem3.totalTensorWeight += voronoiAreas[2];
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

  calculateVoronoiArea(p1, p2, p3) {
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

  checkAllCurvatureValid(vertexHash, posToClusteredSets) {
    for (let perPos of vertexHash) {
      for (let setObj of posToClusteredSets.get(perPos[0])) {
        // for each clustered vertex set, check if set is valid
        if (setObj.valid === false) {
          return false;
        }
      }
    }

    return true;
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