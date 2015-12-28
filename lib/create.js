var fs = require('fs');
var path = require('path');
var handlebars = require('handlebars');
var mkdirp = require('mkdirp');
var inquirer = require('inquirer');
var semver = require('semver');
var bridge = require('neon-bridge');
var gitconfig = require('git-config');

var ROOT_DIR = path.resolve(__dirname, "..");
var TEMPLATES_DIR = path.resolve(ROOT_DIR, "templates");

var NEON_CLI_VERSION = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, "package.json"), 'utf8')).version;
var NEON_BRIDGE_VERSION = bridge.version;

function compile(filename) {
  return handlebars.compile(fs.readFileSync(path.resolve(TEMPLATES_DIR, filename), 'utf8'), { noEscape: true });
}

var GITIGNORE_TEMPLATE = compile(".gitignore.hbs");
var CARGO_TEMPLATE = compile("Cargo.toml.hbs");
var NPM_TEMPLATE = compile("package.json.hbs");
var INDEXJS_TEMPLATE = compile("index.js.hbs");
var LIBRS_TEMPLATE = compile("lib.rs.hbs");
var README_TEMPLATE = compile("README.md.hbs");

function die(err) {
  console.log(err);
  process.exit(1);
}

function guessAuthor() {
  try {
    var config = gitconfig.sync();
    if (config.user.name) {
      return {
        author: config.user.name,
        email: config.user.email
      };
    }
  } catch (e) {
    return {
      author: process.env.USER || process.env.USERNAME,
      email: undefined
    };
  }
}

module.exports = exports = function wizard(pwd, name) {
  console.log("This utility will walk you through creating a Neon project.");
  console.log("It only covers the most common items, and tries to guess sensible defaults.");
  console.log();
  console.log("Press ^C at any time to quit.");

  var root = path.resolve(pwd, name);
  var guess = guessAuthor();

  inquirer.prompt([
    { type: 'input', name: 'name',        message: "name",             default: name           },
    { type: 'input', name: 'version',     message: "version",          default: "1.0.0"        },
    { type: 'input', name: 'description', message: "description"                               },
    { type: 'input', name: 'node',        message: "node entry point", default: "lib/index.js" },
    { type: 'input', name: 'git',         message: "git repository"                            },
    { type: 'input', name: 'author',      message: "author",           default: guess.author   },
    { type: 'input', name: 'email',       message: "email",            default: guess.email    },
    { type: 'input', name: 'license',     message: "license",          default: "MIT"          }
  ], function(answers) {
    var ctx = {
      project: answers,
      "neon-cli": {
        major: semver.major(NEON_CLI_VERSION),
        minor: semver.minor(NEON_CLI_VERSION),
        patch: semver.patch(NEON_CLI_VERSION)
      },
      "neon-bridge": {
        major: semver.major(NEON_BRIDGE_VERSION),
        minor: semver.minor(NEON_BRIDGE_VERSION),
        patch: semver.patch(NEON_BRIDGE_VERSION)
      },
    };

    var lib = path.resolve(root, path.dirname(answers.node));
    var src = path.resolve(root, "src");

    mkdirp(lib, function(err) {
      if (err) die(err);
      mkdirp(src, function(err) {
        if (err) die(err);
        fs.writeFileSync(path.resolve(root, ".gitignore"), GITIGNORE_TEMPLATE(ctx), { flag: 'wx' });
        fs.writeFileSync(path.resolve(root, "package.json"), NPM_TEMPLATE(ctx), { flag: 'wx' });
        fs.writeFileSync(path.resolve(root, "Cargo.toml"), CARGO_TEMPLATE(ctx), { flag: 'wx' });
        fs.writeFileSync(path.resolve(root, "README.md"), README_TEMPLATE(ctx), { flag: 'wx' });
        fs.writeFileSync(path.resolve(root, answers.node), INDEXJS_TEMPLATE(ctx), { flag: 'wx' });
        fs.writeFileSync(path.resolve(src, "lib.rs"), LIBRS_TEMPLATE(ctx), { flag: 'wx' });

        var relativeRoot = path.relative(pwd, root);
        var relativeNode = path.relative(pwd, path.resolve(root, answers.node));
        var relativeRust = path.relative(pwd, path.resolve(root, src + "/lib.rs"));

        console.log();
        console.log("Woo-hoo! Your Neon project has been created in: " + relativeRoot);
        console.log();
        console.log("The main Node entry point is at: " + relativeNode);
        console.log("The main Rust entry point is at: " + relativeRust);
        console.log();
        console.log("To build your project, just run `npm install` from within the `" + relativeRoot + "` directory.");
        console.log("Then you can test it out with `node -e 'require(\"./\")'`.");
        console.log();
        console.log("Happy hacking!");
      });
    });
  });
};
