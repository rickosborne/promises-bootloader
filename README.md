# promises-bootloader

_Simple declarative dependency-driven loading of resources and scripts for a modern Web app_

## Examples

Let's say you're too lazy to use `require` in your UI.  Maybe because you
haven't figured out requirejs or browserify or WebPack or any of those other
nifty tools.  But you're still tired of manually managing the boot scripts for
your app.

    // in your main.js or whatever your first script is
    MyApp.BootLoader = new BootLoader();

    // in some other place
    MyApp.BootLoader.declareResource({
      name: 'zebra',
      requires: ['animal'],
      zebra: function(Animal) {
        MyApp.Zebra = Animal.extend({ /* ... */ });
        return MyApp.Zebra;
      }
    });

    // in some even later place
    MyApp.BootLoader.declareResource({
      name: 'animal',
      animal: function() {
        return SomeBaseClass.extend({ /* ... */ });
      }
    });

Long story short, your boot scripts will execute as their dependencies are
resolved.
