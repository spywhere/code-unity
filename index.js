var yaml = require("yamljs");
var glob = require("glob-all");
var merge = require("merge");

function CodeUnity(){}

CodeUnity.prototype.referenceNode = function(nodeStructure){
    var baseNodes = [];
    for (var key in nodeStructure) {
        if (nodeStructure.hasOwnProperty(key)) {
            var nodeValue = nodeStructure[key];
            var success = true;
            baseNodes = baseNodes.concat(this.referenceNodeInValue(nodeValue));
        }
    }
    return baseNodes;
}

CodeUnity.prototype.referenceNodeInValue = function(nodeValue){
    if(typeof nodeValue === "object"){
        return this.referenceNodeInNode(nodeValue);
    }
    if(typeof nodeValue !== "string"){
        return [];
    }
    return (
        nodeValue.substr(0, 4).toLowerCase() === "ref:"
    ) ? [nodeValue.substr(4)] : [];
}

CodeUnity.prototype.referenceNodeInNode = function(node){
    var baseNodes = [];
    if(node.section){
        baseNodes = baseNodes.concat(this.referenceNode(node.section));
    }
    if(node.child){
        baseNodes = baseNodes.concat(this.referenceNode(node.child));
    }
    return baseNodes;
};

CodeUnity.prototype.structureFor = function(filePath, configPath, callback){
    if(callback){
        var self = this;
        setTimeout(function(){
            try {
                callback(null, self.structureFor(filePath, configPath));
            } catch (error) {
                callback(error);
            }
        }, 0);
        return;
    }
};

CodeUnity.prototype.structureFrom = function(globs, configPath, callback){
    if(callback){
        var self = this;
        setTimeout(function(){
            try {
                callback(null, self.structureFrom(globs, configPath));
            } catch (error) {
                callback(error);
            }
        }, 0);
        return;
    }
    var files = glob.sync(globs);
    var baseStructure = {};
    if(!files){
        return baseStructure;
    }
    var config = yaml.load(configPath);

    for (var index = 0; index < files.length; index++) {
        var file = files[index];
        merge.recursive(baseStructure, this.structureFor(file, configPath))
    }

    return baseStructure;
};

CodeUnity.prototype.outputTo = function(structure, file, callback){
    if(callback){
        var self = this;
        setTimeout(function(){
            try {
                callback(null, self.outputTo(structure, file));
            } catch (error) {
                callback(error);
            }
        }, 0);
        return;
    }
};

var cuty = new CodeUnity();
module.exports = cuty;

cuty.structureFrom("samples/**.js", "samples/.cuty", function(err, result){
    console.log(result);
})
