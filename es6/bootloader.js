export class BootLoader {
  constructor() {
    this._resources = {};
  }

  resourceByName(name) {
    return this._resources[name];
  }

  declareResource(definition) {
    let resource = new Resource(definition);
    if (this._resources[resource.name]) throw new DuplicateResourceNameError(resource.name);
    this._resources[resource.name] = resource;
  }

  [Symbol.iterator]() {

  }
}

class Resource {
  constructor(definition) {
    if (typeof definition !== 'object') throw new InvalidResourceError();
    if (!definition.name) throw new UnnamedResourceError;
    this.name = definition.name;
  }
}

BootLoader.Resource = Resource;

class DuplicateResourceNameError extends Error {
  constructor(name) {
    super();
    this.message = `Duplicate resource name: ${name}`;
  }
}

class UnnamedResourceError extends SyntaxError {}
class InvalidResourceError extends Error {}

BootLoader.DuplicateReourceNameError = DuplicateResourceNameError;
BootLoader.UnnamedResourceError = UnnamedResourceError;
BootLoader.InvalidResourceError = InvalidResourceError;