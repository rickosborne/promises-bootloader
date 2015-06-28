import {BootLoader} from '../es6/bootloader.js';
import {expect} from 'chai';

describe('BootLoader', function() {
  it('is a class', () => expect(BootLoader).is.a('function'));
  describe('instance', () => {
    let simpleResource = (name, req=null) => { return {name: name, [name]: () => 'simpleResourceResult', requires: req}; };
    let simpleProvider = (function() {
      var count = 0;
      return (provider, req=null) => {
        count++;
        return {name: `test${count}`, test: provider, requires: req};
      };
    })();
    beforeEach(() => this.subject = new BootLoader());
    context('api', () => {
      let publicMethods = [
        'declareResource',
        'resourceByName',
        Symbol.iterator
      ];
      for (let methodName of publicMethods) {
        it(`responds to ${methodName}`, () => expect(this.subject).to.respondTo(methodName));
      }
    });
    describe('declareResource', () => {
      it('requires a definition', () => expect(() => this.subject.declareResource()).throws(BootLoader.InvalidResourceError));
      it('requires a definition object', () => expect(() => this.subject.declareResource(1)).throws(BootLoader.InvalidResourceError));
      it('requires a .name', () => expect(() => this.subject.declareResource({})).throws(BootLoader.UnnamedResourceError));
      it('allows .requires to be a string', () => expect(this.subject.declareResource(simpleResource('test', 'req')).resourceByName('test').requires).to.eql(['req']));
      it('requires .requires to be an array', () => expect(() => this.subject.declareResource(simpleResource('test', 1))).throws(BootLoader.InvalidRequiresError));
      it('requires a unique .name', () => expect(() => {
        this.subject.declareResource(simpleResource('one'));
        this.subject.declareResource(simpleResource('one'));
      }).throws(BootLoader.DuplicateReourceNameError));
      it('requires .provider to be a function', () => expect(() => this.subject.declareResource(simpleProvider(1))).throws(BootLoader.InvalidProviderError));
    });
    describe('resourceByName', () => {
      it('returns defined resources', () => expect(this.subject.declareResource(simpleResource('test')).resourceByName('test')).to.be.an.instanceOf(BootLoader.Resource));
      it('returns undefined when not found', () => expect(this.subject.resourceByName('test')).to.be.undefined);
    });
    describe('promiseFor', () => {
      it('eventually resolves resources with no requirements', (done) => {
        this.subject.declareResource(simpleResource('noReqs')).promiseFor('noReqs').then((resource) => {
          expect(resource).to.eql('simpleResourceResult');
          done();
        });
      });
    });
    describe('undeclared', () => {
      it('starts empty', () => expect(this.subject.undeclared).to.be.empty);
      it('reports undeclared requirements', () => expect(this.subject.declareResource(simpleResource('thing1', ['req1', 'req2'])).undeclared).to.contain('req1', 'req2'));
      it('does not report declared requirements', (done) => {
        this.subject.declareResource(simpleResource('thing1', ['req1','req2'])).declareResource(simpleResource('req1')).promiseFor('req1').then(() => {
          expect(this.subject.undeclared).to.eql(['req2']);
          done();
        });
      });
    });
    describe('iterator', () => {
      it('starts empty', () => {
        let resources = [];
        for (let resource of this.subject) {
          resources.push(resource);
        }
        expect(resources).to.be.empty;
      });
      it('includes only declared resources', () => {
        this.subject.
          declareResource(simpleResource('thing1', ['req1','req2'])).
          declareResource(simpleResource('req1')).
          declareResource(simpleResource('thing2', 'req1'))
        ;
        let resources = [];
        for (let resource of this.subject) {
          resources.push(resource.name);
        }
        expect(resources).to.contain('req1', 'thing1', 'thing2');
        expect(resources).to.not.contain('req2');
      });
    });
    describe('functionality', () => {
      it('calls provider functions as their dependencies become available', (done) => {
        let ops = [];
        this.subject.
          declareResource({name: 'A', requires: ['B', 'C'], A: () => ops.push('A')}).
          declareResource({name: 'B', B: () => ops.push('B')}).
          declareResource({name: 'C', requires: 'B', C: () => ops.push('C')})
        ;
        setTimeout(() => {
          expect(ops).to.eql(['B', 'C', 'A']);
          done();
        }, 1);
      });
      it('passes dependencies into provider functions', (done) => {
        this.subject.
          declareResource({name: 'A', requires: ['B', 'C'], A: (b, c) => {
            expect(b).to.eql('BB');
            expect(c).to.eql('CC');
            done();
          }}).
          declareResource({name: 'B', B: () => 'BB'}).
          declareResource({name: 'C', requires: 'B', C: () => 'CC'})
        ;
      });
    });
  });
});