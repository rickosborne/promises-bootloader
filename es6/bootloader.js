export class BootLoader {
  constructor() {
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
    if ((this.provider !== void 0) && ((definition.json !== void 0) || (definition.script !== void 0))) throw new InvalidResourceError('Cannot have both a provider and json/script.');
    if (definition.script !== void 0) {
      this.script = definition.script;
      if (typeof this.script !== 'string') throw new InvalidUrlError();
      let getScript = typeof definition.getScript === 'function' ? definition.getScript : fetchScript;
      this.provider = () => Promise.resolve(getScript(this.script));
    }
    else if (definition.json !== void 0) {
      this.json = definition.json;
      if (typeof this.json !== 'string') throw new InvalidUrlError();
      let ajax = typeof definition.ajax === 'function' ? definition.ajax : fetchJson;
      this.provider = () => Promise.resolve(ajax(this.json));
    }
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

function fetchScript(href) {
  return new Promise((resolve, reject) => {
    let el = document.createElement('script');
    let cleanUp = () => { if (el && el.parentNode) el.parentNode.removeChild(el); };
    el.onload = function fetchScriptOnLoad() {
      cleanUp();
      resolve();
    };
    el.onerror = function fetchScriptError(err) {
      cleanUp();
      let message = '(unknown)';
      if (err && err.error) message = err.error;
      if (err && err.statusText) message = err.statusText;
      if (err && err.message) message = err.message;
      reject(new FetchError(`Script fetch error: ${message}`));
    };
    if (el.addEventListener) el.addEventListener('error', el.onerror);
    else if (el.attachEvent) el.attachEvent('onerror', el.onerror);
    el.src = href;
    el.setAttribute('defer', 'defer');
    el.setAttribute('async', 'async');
    (document.querySelector('head') || document.head || document.body).appendChild(el);
  });
}

function xhrFetch(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.onload = function getScriptOnLoad(response) {
      if (response.target) response = response.target;
      if (!response || !('status' in response)) reject(new FetchError('Invalid XHR response.'));
      if ((response.status !== 0) && ((response.status < 200) || (response.status >= 300))) reject(new FetchError(`Unsuccessful XHR response: ${response.status}`));
      resolve(response);
    };
    xhr.onerror = function getScriptOnError(err) {
      let message = '(unknown)';
      if (err && err.statusText) message = err.statusText;
      reject(new FetchError(`XHR error: ${message}`));
    };
    xhr.open(method, url, true);
    xhr.send();
  });
}

function fetchJson(url, method = 'GET') {
  return xhrFetch(url, method).then((response) => {
    let type = response.getResponseHeader('Content-Type');
    if (!type.match(/json/i)) throw new FetchError(`Resource does not look like JSON: ${type}`);
    try {
      return JSON.parse(response.responseText);
    } catch (err) {
      throw new FetchError(`Resource is not JSON: ${err.message}`);
    }
  });
}

class DuplicateResourceNameError extends Error { constructor(name) { super(`Duplicate resource name: ${name}`); } }

class InvalidResourceError extends Error {}
class UnnamedResourceError extends Error {}
class InvalidRequiresError extends Error {}
class InvalidProviderError extends Error { constructor(name) { super(`Invalid provider: ${name}`); } }
class InvalidUrlError extends Error {}
class FetchError extends Error {}

BootLoader.DuplicateReourceNameError = DuplicateResourceNameError;
BootLoader.UnnamedResourceError = UnnamedResourceError;
BootLoader.InvalidRequiresError = InvalidRequiresError;
BootLoader.InvalidResourceError = InvalidResourceError;
BootLoader.InvalidProviderError = InvalidProviderError;
BootLoader.InvalidUrlError = InvalidUrlError;
BootLoader.FetchError = FetchError;
BootLoader.xhrFetch = xhrFetch;
BootLoader.fetchJson = fetchJson;
BootLoader.fetchScript = fetchScript;