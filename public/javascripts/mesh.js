import { gl } from './context.js';
import { Material } from './material.js';
import { Texture2D } from './texture.js';
import { Program } from './shader.js';
import { util } from './htmlUtil.js';
import * as mat4 from './gl-matrix/mat4.js';
import * as vec3 from './gl-matrix/vec3.js';
import * as vec4 from './gl-matrix/vec4.js';
import * as quat from './gl-matrix/quat.js';

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
  vertexHashes = [];

  // parse the buffer, using the data type we want to pack
  // gl doesn't allow single attribute less than 4 bytes alignment, so we need to pad normal and tanget
  // x-f4, y-f4, z-f4, tx-b1, ty-b1, tz-b1, padding-b1, nx-b1, ny-b1, nz-b1, padding-b1, snx-b1, sny-b1, snz-b1, padding-b1, tu-us2, tv-us2 = 28 bytes;
  vertexSize = 28;

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

    this.recomputeSmoothNormal();
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
      this.initialized = true
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
        if (this.vertexHashes[matIndex]) {
          vertexHash = this.vertexHashes[matIndex];
        } else {
          vertexHash = new Map();
          this.vertexHashes[matIndex] = vertexHash;
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
          outputView.setInt8(i * this.vertexSize + 12, tanDV.getFloat32(tanOffset + (i - currVertCount) * tanStride, true) * 0x7F, true);
          outputView.setInt8(i * this.vertexSize + 13, tanDV.getFloat32(tanOffset + 4 + (i - currVertCount) * tanStride, true) * 0x7F, true);
          outputView.setInt8(i * this.vertexSize + 14, tanDV.getFloat32(tanOffset + 8 + (i - currVertCount) * tanStride, true) * 0x7F, true);
          outputView.setInt8(i * this.vertexSize + 15, tanDV.getFloat32(tanOffset + 12 + (i - currVertCount) * tanStride, true) * 0x7F, true);

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
          var newElem = { index: i, nativeNormal: norVal, weightedNormal: [0.0, 0.0, 0.0], adjacentElem: new Set() };
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
      console.log('[Log] binding skipped, mesh: \"' + this.name + '\" is not initialized');
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

    // texture UV
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 2, gl.UNSIGNED_SHORT, true, this.vertexSize, 24);

    // smoothed normal
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 4, gl.BYTE, true, this.vertexSize, 20);
  }

  draw() {
    if (!this.initialized) {
      console.log('[Log] drawing skipped, mesh: \"' + this.name + '\" is not initialized');
      return;
    }

    //this.recomputeSmoothNormal();

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
      arrayOfSets.push(newSet);
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
          for (let item of set) {
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
        arrayOfSets.push(newSet);
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
      console.log('[Log] Recomputing skipped, mesh: \"' + this.name + '\" is not initialized');
      return;
    }

    let outputBuffer = new Int8Array(3);

    // for all meshes
    for (let matIndex = 0; matIndex < this.materials.length; matIndex++) {
      let vertexHash = this.vertexHashes[matIndex];

      for (let perPos of vertexHash) {
        // we want to divide all weighted normal of this vertex into different sets to combine
        let arrayOfSets = [];
        this.clusterNormal(undefined, perPos[1][0], undefined, perPos[1], arrayOfSets, new Set());

        for (let set of arrayOfSets) {
          // For each set, add up weighted normals
          let accumulatedNormal = [0.0, 0.0, 0.0];
          set.forEach(element => {
            vec3.add(accumulatedNormal, accumulatedNormal, element.weightedNormal);
          });

          vec3.normalize(accumulatedNormal, accumulatedNormal);

          // upload smoothed normal buffer
          set.forEach(element => {
            outputBuffer[0] = accumulatedNormal[0] * 0x7F;
            outputBuffer[1] = accumulatedNormal[1] * 0x7F;
            outputBuffer[2] = accumulatedNormal[2] * 0x7F;
            //outputView.setInt8(element.index * this.vertexSize + 20, accumulatedNormal[0] * 0x7F, true);
            //outputView.setInt8(element.index * this.vertexSize + 21, accumulatedNormal[1] * 0x7F, true);
            //outputView.setInt8(element.index * this.vertexSize + 22, accumulatedNormal[2] * 0x7F, true);

            // upload vertex buffer with new smoothed normals
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo[matIndex]);
            gl.bufferSubData(gl.ARRAY_BUFFER, element.index * this.vertexSize + 20, outputBuffer, 0, 3);
          });
        }
      }
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