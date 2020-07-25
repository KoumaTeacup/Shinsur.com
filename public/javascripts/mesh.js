import { gl } from './context.js';
import { Material } from './material.js';
import { Texture2D } from './texture.js';
import { Program } from './shader.js';
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
            for (var i = 0; i < this.gltf.buffers.length; i++) {
              // fetch binary file
              fetch(fetchAddr + '/' + this.gltf.buffers[i].uri)
                .then(response => {
                  if (!response.ok) {
                    throw new Error('Network response was not ok');
                  }
                  response.blob()
                    .then(_data => {
                      this.buffers.push({ index: i, data: _data });
                      var runParse = new Promise((resolve, reject) =>this.parse());
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

    for (var material of this.gltf.materials) {
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
    for (var i = 0; i < this.materials.length; i++) {
      this.vertCount[i] = 0;
      this.indexCount[i] = 0;
    }

    // calculate the total buf size
    for (var mesh of this.gltf.meshes) {
      for (var primitive of mesh.primitives) {
        var index = primitive.material;
        this.vertCount[index] += this.gltf.accessors[primitive.attributes.POSITION].count;
        this.indexCount[index] += this.gltf.accessors[primitive.indices].count;
      }
    }

    // create the final buf arrays
    var outputBuffer = [];
    var indexBuffer = [];
    for (var i = 0; i < this.materials.length; i++) {
      outputBuffer[i] = new ArrayBuffer(this.vertCount[i] * this.vertexSize);
      indexBuffer[i] = new ArrayBuffer(4 * this.indexCount[i]);
    }

    // clear vertex and index count so we can accumulate offsets later
    for (var i = 0; i < this.materials.length; i++) {
      this.vertCount[i] = 0;
      this.indexCount[i] = 0;
    }

    // parse mesh data
    var parsePrimitiveAsync = [];
    for (var mesh of this.gltf.meshes) {
      for (var primitive of mesh.primitives) {
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

        var normalHash = new Map();
        for (var i = currVertCount; i < this.vertCount[matIndex]; i++) {
          var posVal = [
            posDV.getFloat32(posOffset + (i - currVertCount) * posStride, true) * 100.0,
            posDV.getFloat32(posOffset + 4 + (i - currVertCount) * posStride, true) * 100.0,
            posDV.getFloat32(posOffset + 8 + (i - currVertCount) * posStride, true) * 100.0
          ];
          // assuming position type float32 and 3 components, x100 to compensate Maya scale
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
          // padding
          outputView.setInt8(i * this.vertexSize + 19, 0);

          // gather and smooth normals
          if (!normalHash.has(JSON.stringify(posVal))) {
            normalHash.set(JSON.stringify(posVal), { normal: norVal, count: 1, index:[i] });
          } else {
            var savedNormal = normalHash.get(JSON.stringify(posVal));
            savedNormal.normal = [
              (savedNormal.normal[0] * savedNormal.count + norVal[0]) / (savedNormal.count + 1),
              (savedNormal.normal[1] * savedNormal.count + norVal[1]) / (savedNormal.count + 1),
              (savedNormal.normal[2] * savedNormal.count + norVal[2]) / (savedNormal.count + 1)
            ];

            savedNormal.count++;
            savedNormal.index.push(i);
          }

          // initialize smoothed normal with normal
          outputView.setInt8(i * this.vertexSize + 20, 100, true);
          outputView.setInt8(i * this.vertexSize + 21, 0, true);
          outputView.setInt8(i * this.vertexSize + 22, 100, true);
          // padding
          outputView.setInt8(i * this.vertexSize + 23, 0);

          // assuming uv type float32 and 4 components
          outputView.setUint16(i * this.vertexSize + 24, uvDV.getFloat32(uvOffset + (i - currVertCount) * uvStride, true) * 0xFFFF, true);
          outputView.setUint16(i * this.vertexSize + 26, uvDV.getFloat32(uvOffset + 4 + (i - currVertCount) * uvStride, true) * 0xFFFF, true);
        }

        for (var hash of normalHash) {
          var arrIndex = hash[1].index;
          var snormal = [];
          vec3.normalize(snormal, hash[1].normal);
          for (var index of arrIndex) {
            outputView.setInt8(index * this.vertexSize + 20, snormal[0] * 0x7F, true);
            outputView.setInt8(index * this.vertexSize + 21, snormal[1] * 0x7F, true);
            outputView.setInt8(index * this.vertexSize + 22, snormal[2] * 0x7F, true);
          }
        }

        // assuming only 1 primitve and 1 mesh
        this.vbo[matIndex] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo[matIndex]);
        gl.bufferData(gl.ARRAY_BUFFER, outputBuffer, gl.STATIC_DRAW);

        // assuming unsigned short
        var currIndexCount = this.indexCount[matIndex];
        this.indexCount[matIndex] += accessors[indIndex].count;
        var indexView = new DataView(indexBuffer);

        for (var i = currIndexCount; i < this.indexCount[matIndex]; i++) {
          var index = indDV.getInt16(indOffset + (i - currIndexCount) * 2, true);
          indexView.setUint32(i * 4, index + currVertCount, true);

        }

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

    // Compute model matrix
    var matModel = mat4.fromRotationTranslationScale([], quat.fromEuler([], this.rotation[0], this.rotation[1], this.rotation[2]), this.translate, this.scale);

    // Set uniform
    Program.setUniformMatrix4fv('MatModel', matModel);

    // draw all meshes
    for (var i = 0; i < this.indexCount.length; i++) {
    this.bind(i);
    gl.drawElements(gl.TRIANGLES, this.indexCount[i], gl.UNSIGNED_INT, 0);
    }
  }
}

// a simple plane mesh to display framebuffer
class RenderPlane{
  posX = 0;
  posY = 0;
  scale;
  vbo;
  ibo;
  // gl doesn't allow single attribute less than 4 bytes alignment
  // x-f4, y-f4, z-f4 = 12 bytes;
  vertexSize = 12;

  constructor(_scale = 1.0) {
    this.scale = _scale;

    var left = this.posX / gl.canvas.height * 2.0 - 1.0;
    var right = (this.posX / gl.canvas.height + this.scale) * 2.0 - 1.0;
    var bottom = this.posY / gl.canvas.height * 2.0 - 1.0;
    var top = (this.posY / gl.canvas.height + this.scale) * 2.0 - 1.0;

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

  bind(){
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);

    // position
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, this.vertexSize, 0);

    // Set uniform
    Program.setUniform1f('DrawScale', this.scale);
  }

  draw(){
    this.bind();

    gl.drawElements(gl.TRIANGLE_STRIP, 4, gl.UNSIGNED_SHORT, 0);
  }
}

export { Mesh, RenderPlane };