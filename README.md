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

## Scripts and JSON

You can also have the BootLoader handle AJAX and getScript-like functionality
for you via the `json` and `script` attributes:

    BootLoader.declareResource({
      name: 'animals',
      requires: ['zebraData', 'zebraBehavior'],
      animals: function(data) {
        // the behavior dependency is a script that doesn't return anything
        // so we can leave it out of the arguments list
      }
    });

    // later
    BootLoader.declareResource({
      name: 'zebraBehavior',
      script: 'scripts/zebra.js'
    });

    // still later
    BootLoader.declareResource({
      name: 'zebraData',
      json: 'assets/zebra.json'
    });

Not that you *cannot* define a provider (handler) function for either `json` or
`script` resources.  As in the `animals` example above, declare a post-processing
resource if you want `onLoad`/`then`-style functionality.  (Because that's
kindof the whole point here, right?)

BootLoader has its own AJAX and `getScript` functionality, and so *does not*
require jQuery/zepto/etc to work.  However, if you have something similar
already loaded and you need its more advanced features, you can tell BootLoader
to use it:

    BootLoader.declareResource({
      name: 'zebraBehavior',
      script: 'path/to/zebra.js',
      getScript: $.getScript.bind($)
    });
    BootLoader.declareResource({
      name: 'zebraData',
      json: 'path/to/zebra.json',
      ajax: $.ajax.bind($)
    });
