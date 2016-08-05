var yaml = require("yamljs");
var glob = require("glob-all");
var merge = require("merge");
var fs = require("fs");

function CodeUnity(){}

CodeUnity.prototype.log = function(
    message, options, prefix
){
    options = options || {};
    if(typeof message !== "string"){
        message = yaml.stringify(message);
    }

    var offset = "";
    if(options.indentLevel && options.indentLevel > 0){
        offset += "  ".repeat(options.indentLevel);
    }

    console.log(
        (prefix ? prefix : "") +
        offset +
        message.split("\n").join(
            "\n" +
            offset +
            (prefix ? prefix : "")
        )
    );
};

CodeUnity.prototype.referenceNode = function(
    nodeStructure
){
    var baseNodes = [];
    for (var key in nodeStructure) {
        if (!nodeStructure.hasOwnProperty(key)) {
            continue;
        }
        var nodeValue = nodeStructure[key];
        var success = true;
        baseNodes = baseNodes.concat(this.referenceNodeInValue(nodeValue));
    }
    return baseNodes;
}

CodeUnity.prototype.referenceNodeInValue = function(
    nodeValue
){
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

CodeUnity.prototype.referenceNodeInNode = function(
    node
){
    var baseNodes = [];
    if(node.section){
        baseNodes = baseNodes.concat(this.referenceNode(node.section));
    }
    if(node.child){
        baseNodes = baseNodes.concat(this.referenceNode(node.child));
    }
    return baseNodes;
};

CodeUnity.prototype.isNodeClosing = function(
    content, options
){
    if(!options.closing){
        return false;
    }
    var closingPattern = new RegExp(options.closing, "g");
    return closingPattern.test(content);
};

CodeUnity.prototype.isNodeBody = function(
    content, options
){
    if(this.isNodeClosing(content, options)){
        return false;
    }
    if(!options.test){
        return true;
    }
    var testPattern = new RegExp(options.test, "g");
    return testPattern.test(content);
};

CodeUnity.prototype.contentForLine = function(
    content, options
){
    if(options.prefix){
        // Trim prefix
        var prefixPattern = new RegExp(options.prefix, "g");
        if(prefixPattern.test(content)){
            content = content.substr(prefixPattern.lastIndex);
        }
    }
    return content;
};

CodeUnity.prototype.structureForChild = function(
    child, lines, lineno, opts
){
    var options = JSON.parse(JSON.stringify(opts || {}));
    var invalidCount = 0;
    var structure = {};
    var startLine = lineno;

    while(lineno + invalidCount < lines.length){
        if(this.isNodeClosing(lines[lineno + invalidCount], options)){
            break;
        }

        var valid = this.isNodeBody(lines[lineno + invalidCount], options);
        if(!valid){
            invalidCount += 1;
            if(invalidCount > 1){
                break;
            }
            continue;
        }
        var revertLineno = lineno;
        lineno += invalidCount;
        invalidCount = 0;

        var content = this.contentForLine(lines[lineno], options);
        if(options.indentLevel && options.indentLevel > 0){
            var indentPattern = null;

            if(options.indentLevel > 1){
                indentPattern = new RegExp(
                    "^" + options.indentWord + "{" + options.indentLevel + "}",
                    "g"
                );
            }else{
                indentPattern = /^(\t+| +)/g;
            }
            if(!indentPattern.test(content)){
                lineno = revertLineno;
                break;
            }

            content = content.substr(indentPattern.lastIndex);
        }

        for (var key in child) {
            var hasMatch = false;
            if (!child.hasOwnProperty(key)) {
                continue;
            }
            var childNode = child[key];
            if(typeof childNode === "string"){
                var matchPattern = new RegExp(childNode, "g");
                var matches = matchPattern.exec(content);
                if(!matches){
                    continue;
                }
                hasMatch = true;
                if(structure[key]){
                    structure[key].push(matches[0]);
                }else{
                    structure[key] = [matches[0]];
                }
                lineno += 1;
            }else if(typeof childNode === "object"){
                var result = this.structureForNode(
                    childNode, lines, lineno, options
                );
                if(!result){
                    continue;
                }
                hasMatch = true;
                lineno = result.lineno;
                if(structure[key]){
                    structure[key].push(result.structure);
                }else{
                    structure[key] = [result.structure];
                }
            }
            if(!hasMatch){
                if(lineno === startLine){
                    break;
                }
                continue;
            }
        }
    }

    if(typeof structure === "object" && Object.keys(structure).length === 0){
        return null;
    }

    return {
        lineno: lineno,
        structure: structure
    };
};

CodeUnity.prototype.structureForNode = function(
    node, lines, lineno, opts
){
    var options = JSON.parse(JSON.stringify(opts || node));
    var isRootNode = !opts;
    if(!options.indentLevel){
        options.indentLevel = 0;
    }
    if(isRootNode && node.opening){
        // Test for opening pattern
        var openingPattern = new RegExp(node.opening, "g");
        if(!openingPattern.test(lines[lineno])){
            return null;
        }
        lineno += 1;
    }

    var invalidCount = 0;
    var structure = {};
    var startLine = lineno;

    while(lineno + invalidCount < lines.length){
        if(this.isNodeClosing(lines[lineno + invalidCount], options)){
            break;
        }

        var valid = this.isNodeBody(lines[lineno + invalidCount], options);
        if(!valid){
            invalidCount += 1;
            if(invalidCount > 1){
                break;
            }
            continue;
        }
        var revertLineno = lineno;
        lineno += invalidCount;
        invalidCount = 0;

        var content = this.contentForLine(lines[lineno], options);

        if(options.indentLevel && options.indentLevel > 0){
            var indentPattern = null;

            if(options.indentLevel > 1){
                indentPattern = new RegExp(
                    "^" + options.indentWord + "{" + options.indentLevel + "}",
                    "g"
                );
            }else{
                indentPattern = /^(\t+| +)/g;
            }
            if(!indentPattern.test(content)){
                lineno = revertLineno;
                break;
            }

            content = content.substr(indentPattern.lastIndex);
        }

        var matches = null;
        if(node.pattern){
            // Match the content
            var matchPattern = new RegExp(node.pattern, "g");
            matches = matchPattern.exec(content);
            if(!matches){
                break;
            }
            if(node.capture){
                // Name the capture
                for (var index = 0; index < node.capture.length; index++) {
                    if(index >= matches.length){
                        break;
                    }
                    var captureName = node.capture[index];
                    structure[captureName] = matches[index];
                }
            }else{
                structure = matches[0];
            }
            lineno += 1;
            break;
        }else if(node.child){
            // Match the children
            var childOptions = JSON.parse(JSON.stringify(options));
            if(!isRootNode){
                childOptions.indentLevel += 1;
            }
            var result = this.structureForChild(
                node.child, lines, lineno, childOptions
            );
            if(!result){
                if(lineno === startLine){
                    break;
                }
                lineno += 1;
                continue;
            }
            lineno = result.lineno;
            structure = result.structure;
            break;
        }
        lineno += 1;
    }

    if(typeof structure === "object" && Object.keys(structure).length === 0){
        return null;
    }

    return {
        structure: structure,
        lineno: lineno
    };
};

CodeUnity.prototype.structureFor = function(
    filePath, options, callback
){
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
                !options.config.hasOwnProperty(key) ||
                options.excludes.indexOf(key) >= 0
            ) {
                continue;
            }
            var node = options.config[key];

            var result = this.structureForNode(node, lines, lineno);
            if(!result){
                continue;
            }
            lineno = result.lineno;
            if(structure[key]){
                structure[key].push(result.structure);
            }else{
                structure[key] = [result.structure];
            }
        }
    }
    return structure;
};

CodeUnity.prototype.structureFrom = function(
    globs, options, callback
){
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

CodeUnity.prototype.outputTo = function(
    structure, file, callback
){
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

cuty.structureFrom(
    "samples/nested_child.js", "samples/nested_child.cuty",
    function(err, result){
        if(err){
            console.log(err);
            return;
        }
        console.log(yaml.stringify(result, 10, 2));
    }
);
