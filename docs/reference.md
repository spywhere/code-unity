# Code Unity References

## Command References

Usage: `cuty <input file>... [options]`

Options:
- `-c <file>` or `--config <file>`  
  Config file (default is `.cuty`)
- `-o <file>` or `--output <file>`  
  Output file (default is standard output)
- `-i <identifier>...` or `--include <identifier>...`  
  A node identifier to be use (can be more than one)
- `-x <identifier>...` or `--exclude <identifier>...`  
  A node identifier to be skip (can be more than one)
- `-d <json/yml>` or `--dump <json/yml>`  
  Dump structure to the output
- `-s` or `--silent`  
  Do not output anything (for dump structure file only)

## Configuration References

For easier understanding, please check out the example project in `samples/`.

### Structure

In `.cuty` file is a key-value object, in which the key is a node identifier and the value is a `NodeValue` object.

### NodeValue

Node value can be either one of the following...

- `raw` (String)  
  Raw string
- `ref:<identifier>` (String)  
  A node identifier to reference with
- `<regexp pattern>` (RegExp string)  
  A regular expression to match with
- `Node` object  
  See below...

### Node

- `prefix` (RegExp string)  
  A line prefix
- `opening` (RegExp String)  
  The first alternation for the `prefix`
- `closing` (RegExp String)  
  The second alternation for the `prefix`
- `pattern` (RegExp String)  
  A regular expression to match
- `capture` (Object)  
  A key-value for each RegExp capture in which key is a capture group and value as a node name
- `section` (Object)  
  An unordered key-value for each sub-node in which each key is a node name and value is a `NodeValue` object
- `child` (Object)  
  A key-value for each node list in which each key is a node name and value is a `NodeValue` object

## Output References

## API References
