export class BootLoader {
  constructor(options) {
    typeof options === 'object' || (options = {});
    this._resources = {};
    this._promises = {};
  }

  resourceByName(name) {
    return this._resources[name];
  }

  /**
   * Get either:
   * - the resource's promise, or
   * - a promise for the as-yet-undeclared resource, which will eventually
   *   resolve to the resource's promise when that resource is declared.
   *
   * @param name {String}
   * @returns {Promise}
   */
  promiseFor(name) {
    let resource = this.resourceByName(name);
    if (resource) return resource.promise;
    if (this._promises[name]) return this._promises[name];
    return this._promises[name] = buildResolvablePromise();
  }

  /**
   * Add a new resource, with a `name` and optional `requires`, to the pool of
   * resources that will be loaded.  The definition object should include a
   * method named the same as the `name` of the resource, i.e.:
   *   {
   *     name: 'zebra',
   *     requires: ['animal', 'grass'],
   *     zebra: function(animal, grass) { ... }
   *   }
   * @param resourceDefinition {Object}
   * @returns {BootLoader}
   */
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

function buildResolvablePromise() {
  /*
   This looks awful, I know.  The gist is that we don't have the resource
   yet, so we can't return its promise.  But we need *something* to return,
   and that something has to be a promise.  So it needs to be a promise for
   the as-yet-undeclared resource.  When the resource is finally declared,
   we can resolve this promise to the new promise on the resource itself.
   But that means we need a pseudo-promise that we can tell to resolve itself
   with some value that we'll specify later.
   And you would *think* you could just say `this.resolve = resolve` inside
   the executor function ... but nope, as `this` isn't the promise in there.
   Also, I'd love to encapsulate this inside of a class that extends Promise,
   but as Promise is still mostly shimmed at this point, that's not feasible.
   */
  var resolver = null, rejecter = null, promise = new Promise(function (resolve, reject) {
    resolver = resolve;
    rejecter = reject;
  });
  promise.resolve = resolver;
  promise.reject = rejecter;
  return promise;
}

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