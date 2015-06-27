import {BootLoader} from '../es6/bootloader.js';
import {expect} from 'chai';

describe('BootLoader', function() {
  it('is a class', () => expect(BootLoader).is.a('function'));
  describe('instance', () => {
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
      it('requires a name', () => expect(() => this.subject.declareResource({})).throws(BootLoader.UnnamedResourceError));
      it('requires a unique name', () => expect(() => {
        this.subject.declareResource({name: 'same'});
        this.subject.declareResource({name: 'same'});
      }).throws(BootLoader.DuplicateReourceNameError));
    });
  });
});