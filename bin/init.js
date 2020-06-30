console.log('Starting shader concatenating');

var fs = require('fs');

var list = fs.readdirSync(__dirname+ '/../shsrc');
list.forEach(shaderFile => {
  var re = /(?:\.([^.]+))?$/;
  var ext = re.exec(shaderFile);
  if(ext[1] === 'vs' || ext[1] === 'fs')
  {
    var rawFile = fs.readFileSync(__dirname+ '/../shsrc/' + shaderFile, 'utf8');
    rawFile = 'var shaderSrc = `' + rawFile + '`;module.exports=shaderSrc;';
    fs.writeFileSync(__dirname+ '/../public/shaders/' + shaderFile + '.js', rawFile);
    console.log('Shader file generate successfully: ' + shaderFile);
  };
});
