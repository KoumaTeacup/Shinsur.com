console.log('Starting shader concatenating');

var fs = require('fs');

var list = fs.readdirSync(__dirname + '/../shsrc');
var output = 'export let srcArray = [';
list.forEach(shaderFile => {
  var re = /(?:\.([^.]+))?$/;
  var ext = re.exec(shaderFile);
  if (ext[1] === 'vert' || ext[1] === 'frag') {
    shaderFile.substring(0, ext.index)
    var rawFile = fs.readFileSync(__dirname + '/../shsrc/' + shaderFile, 'utf8');
    rawFile = (rawFile.replace(/\/\/.*$/gm, '')).replace(/\s\s/gm, '');
    output += '{descName: \'' + shaderFile.replace(/\..*$/, '') + '\', type: \'' + ext[1] + '\', data: `' + rawFile + '`}, ';
    console.log('Shader file generate successfully: ' + shaderFile);
  };
});

output = output.substring(0, output.length - 2);

fs.writeFileSync(__dirname + '/../public/javascripts/shsrc.js', output + '];');
