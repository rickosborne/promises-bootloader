export class BootLoader {
  constructor(options) {
    typeof options === 'object' || (options = {});
    this._resources = {};
    this._promises = {};
  }

  resourceByName(name) {
    return this._resources[name];
  }

  promiseFor(name) {
    let resource = this.resourceByName(name);
    if (resource) return resource.promise;
    if (this._promises[name]) return this._promises[name];
    var resolver = null, rejecter = null, promise = new Promise(function (resolve, reject) {
      resolver = resolve;
      rejecter = reject;
    });
    promise.resolve = resolver;
    promise.reject = rejecter;
    return this._promises[name] = promise;
  }

  declareResource(resourceDefinition) {
    let resource = new Resource(resourceDefinition);
    if (this._resources[resource.name]) throw new DuplicateResourceNameError(resource.name);
    resource.promise = Promise.all(resource.requires.map((name) => this.promiseFor(name))).then((dependencies) => resource.resolveWith(dependencies));
    if (this._promises[resource.name] && this._promises[resource.name].resolve) {
      this._promises[resource.name].resolve(resource.promise);
      delete this._promises[resource.name];
    }
    this._resources[resource.name] = resource;
    return this;
  }

  get undeclared() {
    return Object.keys(this._promises);
  }

  [Symbol.iterator]() {
    let resources = Object.keys(this._resources).sort().map((name) => this._resources[name]);
    return {
      next() {
        return {
          value: resources.shift(),
          done: resources.length < 1
        }
      }
    };
  }
}

class Resource {
  constructor(definition) {
    if (typeof definition !== 'object') throw new InvalidResourceError();
    this.name = definition.name;
    if (!this.name) throw new UnnamedResourceError();
    this.requires = definition.requires;
    if (typeof this.requires === 'string') this.requires = [this.requires];
    else if (!this.requires) this.requires = [];
    if (!Array.isArray(this.requires)) throw new InvalidRequiresError();
    this.provider = definition[this.name];
    if (typeof this.provider !== 'function') throw new InvalidProviderError(this.name);
  }

  resolveWith(dependencies) {
    return Promise.resolve(this.provider(...dependencies));
  }

}

BootLoader.Resource = Resource;

class DuplicateResourceNameError extends Error { constructor(name) { super(`Duplicate resource name: ${name}`); } }

class InvalidResourceError extends Error {}
class UnnamedResourceError extends SyntaxError {}
class InvalidRequiresError extends SyntaxError {}
class InvalidProviderError extends Error { constructor(name) { super(`Invalid provider: ${name}`); } }

BootLoader.DuplicateReourceNameError = DuplicateResourceNameError;
BootLoader.UnnamedResourceError = UnnamedResourceError;
BootLoader.InvalidRequiresError = InvalidRequiresError;
BootLoader.InvalidResourceError = InvalidResourceError;
BootLoader.InvalidProviderError = InvalidProviderError;