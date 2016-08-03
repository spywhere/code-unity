var yaml = require("yamljs");
var glob = require("glob-all");
var merge = require("merge");
var fs = require("fs");

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

CodeUnity.prototype.structureForNode = function(node, lines, lineno){
    // Test for opening
    if(node.opening){
        var openingPattern = new RegExp(node.opening, "g");
        if(!openingPattern.test(lines[lineno])){
            return null;
        }
        lineno += 1;
    }

    var invalidCount = 0;
    var structure = {};

    while(lineno < lines.length){
        var valid = false;
        // Test for testing pattern
        if(node.test){
            var testPattern = new RegExp(node.test, "g");
            valid = valid || testPattern.test(lines[lineno]);
        }
        if(!valid){
            invalidCount += 1;
            if(invalidCount > 1){
                break;
            }
            lineno += 1;
            continue;
        }
        invalidCount = 0;

        var content = lines[lineno];
        if(node.prefix){
            var prefixPattern = new RegExp(node.prefix, "g");
            if(prefixPattern.test(content)){
                content = content.substr(prefixPattern.lastIndex);
            }
        }
        var matches = null;
        if(node.pattern){
            var matchPattern = new RegExp(node.pattern, "g");
            matches = matchPattern.exec(content);
        }
        if(!matches){
            break;
        }
        if(node.capture){
            for (var index = 0; index < node.capture.length; index++) {
                var captureName = node.capture[index];
                if(index >= matches.length){
                    break;
                }
                structure[captureName] = matches[index];
            }
        }else{
            structure = matches[0];
        }
        lineno += 1;
    }
    if(Object.keys(structure).length == 0){
        return null;
    }

    return {
        structure: structure,
        lineno: lineno
    };
};

CodeUnity.prototype.structureFor = function(filePath, options, callback){
    if(callback){
        var self = this;
        setTimeout(function(){
            try {
                callback(null, self.structureFor(filePath, options));
            } catch (error) {
                callback(error);
            }
        }, 0);
        return;
    }

    var structure = {};
    var lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/g);
    for (var lineno = 0; lineno < lines.length; lineno++) {
        var line = lines[lineno];
        for (var key in options.config) {
            if (
                options.config.hasOwnProperty(key) &&
                options.excludes.indexOf(key) < 0
            ) {
                var node = options.config[key];

                var result = this.structureForNode(node, lines, lineno);
                if(result){
                    lineno = result.lineno;
                    if(structure[key]){
                        structure[key].push(result.structure);
                    }else{
                        structure[key] = [result.structure];
                    }
                }
            }
        }
    }
    console.log(structure);
};

CodeUnity.prototype.structureFrom = function(globs, options, callback){
    if(callback){
        var self = this;
        setTimeout(function(){
            try {
                callback(null, self.structureFrom(globs, options));
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
    if(typeof options === "string"){
        options = {
            configPath: options
        };
    }
    if(!options.config){
        options.config = yaml.load(options.configPath);
    }
    if(!options.excludes){
        options.excludes = this.referenceNode(options.config);
    }

    for (var index = 0; index < files.length; index++) {
        var file = files[index];
        merge.recursive(baseStructure, this.structureFor(file, options))
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

cuty.structureFrom("samples/simple.js", "samples/simple.cuty", function(err, result){
    console.log(result);
})
